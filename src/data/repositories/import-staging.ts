import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getOrgSubscription } from "@/data/repositories/subscription";
import { resolveImportRowLimit } from "@/lib/subscriptions/tiers";
import {
  CHUNK_MAX_ROWS,
  ENTITY_LABELS,
  IMPORT_ENTITIES,
  formatLimitNote,
  formatRowError,
  validateRow,
  type BeginResult,
  type CommitResult,
  type ImportCounts,
  type ImportEntity,
  type StageResult,
  type StagedRow,
  type StatusResult,
} from "@/lib/importer/chunked-import";

/**
 * Server side of the chunked smart import.
 *
 *   begin  -> creates (or resumes) an import_sessions row
 *   stage  -> one call per chunk; the chunk is stored as ONE import_staged_chunks
 *             row (JSONB, rows grouped by entity) — nothing touches real tables
 *   commit -> ONE transaction: one set-based statement validates every
 *             reference, then one set-based statement per entity writes it
 *             (jsonb_to_recordset over the staged chunks, foreign keys resolved
 *             by a single join). No per-row queries. Any failure rolls the
 *             whole thing back and the staged chunks are deleted.
 *
 * Every query is filtered by the caller's orgId; a session id from another
 * org is indistinguishable from a missing one.
 */

const STALE_SESSION_MS = 24 * 60 * 60 * 1000;
// A commit whose request died mid-flight leaves status "committing" (the DB
// rolled its transaction back). After this long it may be claimed again.
const STUCK_COMMIT_MS = 6 * 60 * 1000;
// Leaves margin inside the pages' maxDuration (300s) for the response.
const COMMIT_TX_TIMEOUT_MS = 270_000;
const MAX_ERRORS_SHOWN = 5;
// The only placeholder record an import may create: a clearly labelled
// supplier for products / POs whose rows name no supplier.
const UNASSIGNED_SUPPLIER_ID = "SUP-UNASSIGNED";
const EXPIRED = "This upload has expired or was cancelled. Please start the import again.";

export const ZERO_COUNTS: ImportCounts = {
  warehouses: 0,
  suppliers: 0,
  products: 0,
  inventory: 0,
  purchaseOrders: 0,
  transactions: 0,
};

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export async function getImportRowLimit(orgId: string, isDemo: boolean): Promise<number> {
  const [subscription, org] = await Promise.all([
    getOrgSubscription(orgId),
    prisma.organization.findUnique({ where: { orgId }, select: { importRowLimitOverride: true } }),
  ]);
  return resolveImportRowLimit({
    plan: subscription.plan,
    isDemoOrTrial: isDemo || subscription.status === "trialing",
    orgOverride: org?.importRowLimitOverride,
  });
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function cleanupStaleImportSessions(orgId?: string): Promise<number> {
  // Staged chunks go with their session (ON DELETE CASCADE). orgId is omitted
  // only by the maintenance cron, which sweeps every org.
  const res = await prisma.importSession.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - STALE_SESSION_MS) }, ...(orgId ? { orgId } : {}) },
  });
  return res.count;
}

type ChunkSummary = { chunkIndices: number[]; rows: number; counts: Omit<ImportCounts, "transactions"> & { transactions: number } };

/**
 * Which chunks of a session arrived, how many rows, and per-entity counts
 * ($1 = orgId, $2 = sessionId). Exported so probes can EXPLAIN exactly this SQL.
 */
export function chunkSummarySql(): string {
  const len = (entity: ImportEntity) => `COALESCE(SUM(jsonb_array_length(COALESCE(payload->'${entity}', '[]'::jsonb))), 0)::int`;
  // Warehouses / suppliers / products the file only mentions aren't "imported".
  const described = (entity: ImportEntity) =>
    `COALESCE(SUM((SELECT count(*) FROM jsonb_array_elements(COALESCE(payload->'${entity}', '[]'::jsonb)) e
       WHERE NOT COALESCE((e->>'referenceOnly')::boolean, false))), 0)::int`;
  return `SELECT array_agg(chunk_index ORDER BY chunk_index) AS chunks, COALESCE(SUM(row_count), 0)::int AS rows,
       ${described("warehouse")} AS w, ${described("supplier")} AS s, ${described("product")} AS p,
       ${len("inventory")} AS i, ${len("purchase_order")} AS po, ${len("transaction")} AS t
     FROM import_staged_chunks WHERE org_id = $1 AND session_id = $2`;
}

/** One query: which chunks arrived, how many rows, and per-entity counts. */
async function summarizeChunks(orgId: string, sessionId: string): Promise<ChunkSummary> {
  const [r] = await prisma.$queryRawUnsafe<
    { chunks: number[] | null; rows: number; w: number; s: number; p: number; i: number; po: number; t: number }[]
  >(
    chunkSummarySql(),
    orgId,
    sessionId
  );
  return {
    chunkIndices: r.chunks ?? [],
    rows: r.rows,
    counts: { warehouses: r.w, suppliers: r.s, products: r.p, inventory: r.i, purchaseOrders: r.po, transactions: r.t },
  };
}

export async function beginImportSession(
  orgId: string,
  input: { fingerprint: string; totalRows: number; totalChunks: number; clearExisting: boolean; rowLimit: number }
): Promise<BeginResult> {
  const { fingerprint, totalRows, totalChunks, clearExisting, rowLimit } = input;

  if (!Number.isInteger(totalRows) || totalRows < 1 || !Number.isInteger(totalChunks) || totalChunks < 1) {
    return { ok: false, error: "The file has no rows to import." };
  }
  if (totalRows > rowLimit) {
    return { ok: false, error: formatLimitNote(totalRows, rowLimit), limitExceeded: { rows: totalRows, limit: rowLimit } };
  }
  if (totalChunks > totalRows || totalChunks < Math.ceil(totalRows / CHUNK_MAX_ROWS)) {
    return { ok: false, error: `Chunk count ${totalChunks} doesn't fit ${totalRows} rows.` };
  }
  if (typeof fingerprint !== "string" || !/^[0-9a-f]{64}$/.test(fingerprint)) {
    return { ok: false, error: "Invalid upload fingerprint." };
  }

  await cleanupStaleImportSessions(orgId);

  // Same file, same mode, still uploading: resume it.
  const existing = await prisma.importSession.findFirst({
    where: { orgId, fingerprint, status: "uploading", totalRows, totalChunks, clearExisting },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    const summary = await summarizeChunks(orgId, existing.id);
    return { ok: true, sessionId: existing.id, receivedChunks: summary.chunkIndices, resumed: true };
  }

  const session = await prisma.importSession.create({
    data: { id: randomUUID(), orgId, status: "uploading", fingerprint, totalRows, totalChunks, clearExisting },
  });
  return { ok: true, sessionId: session.id, receivedChunks: [], resumed: false };
}

export async function getImportSessionStatus(orgId: string, sessionId: string): Promise<StatusResult> {
  const session = await prisma.importSession.findFirst({ where: { orgId, id: sessionId } });
  if (!session) return { ok: false, error: EXPIRED };
  const summary = await summarizeChunks(orgId, sessionId);
  return {
    ok: true,
    status: session.status,
    totalRows: session.totalRows,
    totalChunks: session.totalChunks,
    receivedChunks: summary.chunkIndices,
  };
}

export async function cancelImportSession(orgId: string, sessionId: string): Promise<void> {
  await prisma.importSession.deleteMany({ where: { orgId, id: sessionId, status: { in: ["uploading", "failed"] } } });
}

// ---------------------------------------------------------------------------
// Staging — 2 statements per chunk
// ---------------------------------------------------------------------------

export async function stageImportChunk(
  orgId: string,
  sessionId: string,
  chunkIndex: number,
  rows: StagedRow[]
): Promise<StageResult> {
  const session = await prisma.importSession.findFirst({ where: { orgId, id: sessionId } });
  if (!session) return { ok: false, error: EXPIRED };
  if (session.status !== "uploading") return { ok: false, error: "This upload is already being saved." };
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= session.totalChunks) {
    return { ok: false, error: `Chunk ${chunkIndex + 1} is outside this upload (${session.totalChunks} chunks).` };
  }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > CHUNK_MAX_ROWS) {
    return { ok: false, error: `Chunk ${chunkIndex + 1} must contain between 1 and ${CHUNK_MAX_ROWS.toLocaleString("en-US")} rows.` };
  }

  // Re-validate every row server-side: the browser's extractor is not trusted.
  const problems: string[] = [];
  const payload: Partial<Record<ImportEntity, Record<string, unknown>[]>> = {};
  for (const row of rows) {
    const p = validateRow(row);
    if (p) {
      problems.push(
        formatRowError({
          chunkIndex,
          totalChunks: session.totalChunks,
          entity: IMPORT_ENTITIES.includes(row?.entity) ? row.entity : "transaction",
          rowNumber: Number.isInteger(row?.rowNumber) ? row.rowNumber : 0,
          column: p.column,
          problem: p.problem,
        })
      );
      if (problems.length >= MAX_ERRORS_SHOWN) break;
      continue;
    }
    (payload[row.entity] ??= []).push({ ...(row.data as unknown as Record<string, unknown>), _row: row.rowNumber });
  }
  if (problems.length > 0) return { ok: false, error: problems.join("\n") };

  // Upsert the chunk (a retried chunk replaces itself) and total up the
  // session in the same statement. Only lands while the session is still
  // uploading, so a chunk can't sneak in after the commit has started.
  const [r] = await prisma.$queryRawUnsafe<{ stored: boolean; chunks: number; rows: number }[]>(
    `WITH up AS (
       INSERT INTO import_staged_chunks (org_id, session_id, chunk_index, row_count, payload)
       SELECT $1, $2, $3, $4, $5::jsonb
       WHERE EXISTS (SELECT 1 FROM import_sessions WHERE org_id = $1 AND id = $2 AND status = 'uploading')
       ON CONFLICT (org_id, session_id, chunk_index) DO UPDATE SET row_count = EXCLUDED.row_count, payload = EXCLUDED.payload
       RETURNING row_count
     )
     SELECT EXISTS (SELECT 1 FROM up) AS stored,
       (SELECT count(*) FROM import_staged_chunks WHERE org_id = $1 AND session_id = $2 AND chunk_index <> $3)::int
         + (SELECT count(*) FROM up)::int AS chunks,
       (SELECT COALESCE(SUM(row_count), 0) FROM import_staged_chunks WHERE org_id = $1 AND session_id = $2 AND chunk_index <> $3)::int
         + COALESCE((SELECT row_count FROM up), 0) AS rows`,
    orgId,
    sessionId,
    chunkIndex,
    rows.length,
    JSON.stringify(payload)
  );
  if (!r.stored) return { ok: false, error: "This upload is already being saved." };
  if (r.rows > session.totalRows) {
    await prisma.importStagedChunk.deleteMany({ where: { orgId, sessionId, chunkIndex } });
    return { ok: false, error: `Upload has more rows than the ${session.totalRows.toLocaleString("en-US")} it declared.` };
  }
  return { ok: true, receivedChunks: r.chunks };
}

// ---------------------------------------------------------------------------
// Commit SQL ($1 = orgId, $2 = sessionId throughout)
// ---------------------------------------------------------------------------

export type CommitStep = "validate" | "clear" | ImportEntity;

/** One entity's staged records as typed columns — a set-returning expansion, not a per-row lookup. */
function staged(entity: ImportEntity, columns: string): string {
  return `import_staged_chunks c CROSS JOIN LATERAL jsonb_to_recordset(c.payload->'${entity}') AS x(${columns}, _row int)
    WHERE c.org_id = $1 AND c.session_id = $2`;
}

/**
 * Every reference (product → supplier, stock/PO/transaction → product,
 * warehouse, supplier) checked in ONE statement. Referenced keys EXCEPT known
 * keys is a hashed set difference — linear however the planner's statistics
 * look. (The first version used a correlated NOT EXISTS per reference over
 * unindexed JSON; on a bloated table it degraded to a nested loop and ran
 * 14+ minutes on 20k rows.) Returns the first few offending rows + total.
 */
export function referenceCheckSql(clearExisting: boolean): string {
  const ref = (ord: number, entity: ImportEntity, column: string, target: ImportEntity, key: string) =>
    `SELECT ${ord} AS ord, '${entity}' AS entity, '${column}' AS col, '${target}' AS t, c.chunk_index, x._row, x.${key} AS v, 'ref' AS kind
     FROM ${staged(entity, `${key} text`)}`;
  // Only records the file actually describes count as "known": a supplier or
  // SKU it merely mentions must already exist in the workspace (creating one
  // would invent its name, lead time or cost). Exceptions: the labelled
  // "Unassigned Supplier" for products / POs that name no supplier, and a
  // warehouse named only on stock rows (created under that name — see the
  // warehouse statement).
  const described = `AND NOT COALESCE(x."referenceOnly", false)`;
  return `WITH known AS (
  SELECT 'warehouse' AS t, x.code AS k FROM ${staged("warehouse", "code text")}
  UNION SELECT 'supplier', x."supplierId" FROM ${staged("supplier", `"supplierId" text, "referenceOnly" boolean`)}
    AND (NOT COALESCE(x."referenceOnly", false) OR x."supplierId" = '${UNASSIGNED_SUPPLIER_ID}')
  UNION SELECT 'product', x.sku FROM ${staged("product", `sku text, "unitCost" numeric, "referenceOnly" boolean`)} ${described}
    AND x."unitCost" IS NOT NULL
  ${
    clearExisting
      ? ""
      : `UNION SELECT 'warehouse', code FROM warehouses WHERE org_id = $1
  UNION SELECT 'supplier', supplier_id FROM suppliers WHERE org_id = $1
  UNION SELECT 'product', sku FROM products WHERE org_id = $1`
  }
), refs AS (
  ${ref(1, "product", "supplier", "supplier", `"supplierId"`)}
  UNION ALL ${ref(2, "inventory", "sku", "product", "sku")}
  UNION ALL ${ref(3, "inventory", "warehouse", "warehouse", `"warehouseCode"`)}
  UNION ALL ${ref(4, "purchase_order", "supplier", "supplier", `"supplierId"`)}
  UNION ALL ${ref(5, "purchase_order", "sku", "product", "sku")}
  UNION ALL ${ref(6, "transaction", "sku", "product", "sku")}
  UNION ALL ${ref(7, "transaction", "warehouse", "warehouse", `"warehouseCode"`)}
), missing AS (
  SELECT t, v AS k FROM refs EXCEPT SELECT t, k FROM known
), problems AS (
  SELECT r.* FROM refs r JOIN missing m ON m.t = r.t AND m.k = r.v
  UNION ALL
  -- A product row without a cost can update an existing product (its cost is
  -- kept) but cannot create a new one: no cost is ever filled in.
  SELECT 0, 'product', 'unit_cost', 'product', c.chunk_index, x._row, x.sku, 'nocost'
  FROM ${staged("product", `sku text, "unitCost" numeric, "referenceOnly" boolean`)} ${described}
    AND x."unitCost" IS NULL
    ${clearExisting ? "" : `AND NOT EXISTS (SELECT 1 FROM products p WHERE p.org_id = $1 AND p.sku = x.sku)`}
), bad AS (
  SELECT p.*, row_number() OVER (ORDER BY p.ord, p._row) AS rn, count(*) OVER () AS total FROM problems p
)
SELECT entity, col, t AS target, chunk_index AS "chunkIndex", _row AS "rowNumber", v AS value, kind, total
FROM bad WHERE rn <= ${MAX_ERRORS_SHOWN} ORDER BY rn`;
}

// Warehouses / suppliers / products: update existing rows and insert new
// ones in ONE statement (data-modifying CTE). A blank value in the file keeps
// the existing value instead of overwriting it with a default. Duplicate keys
// within the file: the last row wins (DISTINCT ON ... ORDER BY _row DESC).
// A "referenceOnly" row (the file only mentions the ID / code / SKU) is
// inserted if missing but never used to update an existing record.
/**
 * Every write the commit makes — one set-based statement per entity, in
 * dependency order. Exported so timing / EXPLAIN probes run exactly this SQL.
 * The transactions statement returns the number of rows inserted
 * (import_key makes re-imported ledger rows no-ops).
 */
export const COMMIT_STATEMENTS: { step: ImportEntity; sql: string }[] = [
  {
    step: "warehouse",
    sql: `WITH src AS (
  SELECT DISTINCT ON (x.code) x.code, x.name, x."capacityUnits" AS cap, COALESCE(x."referenceOnly", false) AS ref_only
  FROM ${staged("warehouse", `code text, name text, "capacityUnits" int, "referenceOnly" boolean`)}
  ORDER BY x.code, x._row DESC
), upd AS (
  UPDATE warehouses w SET name = src.name, capacity_units = CASE WHEN src.cap > 0 THEN src.cap ELSE w.capacity_units END
  FROM src WHERE w.org_id = $1 AND w.code = src.code AND NOT src.ref_only
  RETURNING w.code
)
INSERT INTO warehouses (org_id, code, name, capacity_units)
SELECT $1, src.code, src.name, CASE WHEN src.cap > 0 THEN src.cap END FROM src
WHERE NOT EXISTS (SELECT 1 FROM upd WHERE upd.code = src.code)
-- A warehouse only named on stock rows (e.g. a "Godown" column) is created
-- if missing under that name — it is never used to update an existing one.
-- A new warehouse the file gives no capacity for is saved with capacity
-- NULL ("unknown"), never a placeholder number (the preview says so).
ON CONFLICT (org_id, code) DO NOTHING`,
  },
  {
    step: "supplier",
    sql: `WITH src AS (
  SELECT DISTINCT ON (x."supplierId") x."supplierId" AS sid, x.name, x."leadTimeDays" AS lead,
    COALESCE(x."leadTimeMissing", false) AS missing, COALESCE(x.email, '') AS email, COALESCE(x."referenceOnly", false) AS ref_only
  FROM ${staged("supplier", `"supplierId" text, name text, "leadTimeDays" int, "leadTimeMissing" boolean, email text, "referenceOnly" boolean`)}
  ORDER BY x."supplierId", x._row DESC
), upd AS (
  UPDATE suppliers p SET name = src.name, email = src.email, lead_time_missing = src.missing,
    lead_time_days = CASE WHEN src.lead > 0 THEN src.lead ELSE p.lead_time_days END
  FROM src WHERE p.org_id = $1 AND p.supplier_id = src.sid AND NOT src.ref_only
  RETURNING p.supplier_id
)
INSERT INTO suppliers (org_id, supplier_id, name, lead_time_days, lead_time_missing, email)
SELECT $1, src.sid, src.name, COALESCE(NULLIF(src.lead, 0), 14), src.missing, src.email FROM src
WHERE NOT EXISTS (SELECT 1 FROM upd WHERE upd.supplier_id = src.sid)
  -- A supplier the file only mentions by ID is never created (it must already
  -- exist). The one placeholder allowed is the labelled "Unassigned
  -- Supplier", and only when a product row or PO in this file points at it.
  AND (
    NOT src.ref_only
    OR (
      src.sid = '${UNASSIGNED_SUPPLIER_ID}'
      AND (
        EXISTS (
          SELECT 1 FROM import_staged_chunks c2
            CROSS JOIN LATERAL jsonb_to_recordset(c2.payload->'product') AS p("supplierId" text, "referenceOnly" boolean)
          WHERE c2.org_id = $1 AND c2.session_id = $2 AND p."supplierId" = src.sid AND NOT COALESCE(p."referenceOnly", false)
        )
        OR EXISTS (
          SELECT 1 FROM import_staged_chunks c3
            CROSS JOIN LATERAL jsonb_to_recordset(c3.payload->'purchase_order') AS o("supplierId" text)
          WHERE c3.org_id = $1 AND c3.session_id = $2 AND o."supplierId" = src.sid
        )
      )
    )
  )
ON CONFLICT (org_id, supplier_id) DO NOTHING`,
  },
  {
    step: "product",
    sql: `WITH src AS (
  SELECT DISTINCT ON (x.sku) x.sku, x.name, NULLIF(x.category, '') AS category, x."unitCost" AS cost, x."supplierId" AS sid,
    COALESCE(x."referenceOnly", false) AS ref_only
  FROM ${staged("product", `sku text, name text, category text, "unitCost" numeric, "supplierId" text, "referenceOnly" boolean`)}
  ORDER BY x.sku, x._row DESC
), upd AS (
  -- No cost in the file keeps the existing cost; it is never set to 0.
  UPDATE products p SET name = src.name, unit_cost = COALESCE(src.cost, p.unit_cost), supplier_id = src.sid,
    category = COALESCE(src.category, p.category)
  FROM src WHERE p.org_id = $1 AND p.sku = src.sku AND NOT src.ref_only
  RETURNING p.sku
)
INSERT INTO products (org_id, sku, name, category, unit_cost, supplier_id)
SELECT $1, src.sku, src.name, COALESCE(src.category, 'General'), src.cost, src.sid FROM src
WHERE NOT EXISTS (SELECT 1 FROM upd WHERE upd.sku = src.sku)
  -- Never create a product the file only mentions, or one without a cost
  -- (validation already refused the import if such a product was new).
  AND NOT src.ref_only AND src.cost IS NOT NULL
ON CONFLICT (org_id, sku) DO NOTHING`,
  },
  {
    step: "inventory",
    // Warehouse code -> id resolved by one join.
    sql: `INSERT INTO inventory (org_id, sku, warehouse_id, quantity_on_hand)
SELECT DISTINCT ON (x.sku, w.id) $1, x.sku, w.id, x."quantityOnHand"
FROM import_staged_chunks c
  CROSS JOIN LATERAL jsonb_to_recordset(c.payload->'inventory') AS x(sku text, "warehouseCode" text, "quantityOnHand" int, _row int)
  JOIN warehouses w ON w.org_id = $1 AND w.code = x."warehouseCode"
WHERE c.org_id = $1 AND c.session_id = $2
ORDER BY x.sku, w.id, x._row DESC
ON CONFLICT (org_id, sku, warehouse_id) DO UPDATE SET quantity_on_hand = EXCLUDED.quantity_on_hand`,
  },
  {
    step: "purchase_order",
    sql: `INSERT INTO purchase_orders (org_id, po_number, supplier_id, sku, quantity, unit_price, order_date, expected_date, received_date)
SELECT DISTINCT ON (x."poNumber") $1, x."poNumber", x."supplierId", x.sku, x.quantity, x."unitPrice",
  x."orderDate"::date, x."expectedDate"::date, x."receivedDate"::date
FROM ${staged("purchase_order", `"poNumber" text, "supplierId" text, sku text, quantity int, "unitPrice" numeric, "orderDate" text, "expectedDate" text, "receivedDate" text`)}
ORDER BY x."poNumber", x._row DESC
ON CONFLICT (org_id, po_number) DO UPDATE SET supplier_id = EXCLUDED.supplier_id, sku = EXCLUDED.sku,
  quantity = EXCLUDED.quantity, unit_price = EXCLUDED.unit_price, order_date = EXCLUDED.order_date,
  expected_date = EXCLUDED.expected_date, received_date = EXCLUDED.received_date`,
  },
  {
    step: "transaction",
    // Append-only ledger; warehouse code -> id resolved by one join.
    sql: `INSERT INTO transactions (org_id, sku, warehouse_id, quantity, direction, date, import_key)
SELECT $1, x.sku, w.id, x.quantity, x.direction::"TransactionDirection", x.date::date, x."importKey"
FROM import_staged_chunks c
  CROSS JOIN LATERAL jsonb_to_recordset(c.payload->'transaction')
    AS x(sku text, "warehouseCode" text, quantity int, direction text, date text, "importKey" text, _row int)
  JOIN warehouses w ON w.org_id = $1 AND w.code = x."warehouseCode"
WHERE c.org_id = $1 AND c.session_id = $2
ON CONFLICT (org_id, import_key) DO NOTHING`,
  },
];

// ---------------------------------------------------------------------------
// Commit — merge mode: 13 database round trips in total, replace mode: 19
//   before the tx: session, chunk summary, claim                     3
//   tx: BEGIN, reference check, 6 entity writes, COMMIT              9
//   replace mode only: 6 deletes (one per table)                    +6
//   after: delete the session (chunks cascade)                       1
// ---------------------------------------------------------------------------

class DemoRollback extends Error {
  constructor(readonly counts: ImportCounts, readonly skipped: number) {
    super("demo rollback");
  }
}

export async function commitImportSession(
  orgId: string,
  sessionId: string,
  opts: {
    /** Demo org: run everything for real inside the transaction, then roll it back. */
    simulate?: boolean;
    /** Called before each step inside the transaction; throwing aborts the commit. */
    onStep?: (step: CommitStep) => void | Promise<void>;
  } = {}
): Promise<CommitResult> {
  const session = await prisma.importSession.findFirst({ where: { orgId, id: sessionId } });
  if (!session) return { ok: false, error: EXPIRED };

  const summary = await summarizeChunks(orgId, sessionId);
  if (summary.chunkIndices.length !== session.totalChunks) {
    const have = new Set(summary.chunkIndices);
    const missing = Array.from({ length: session.totalChunks }, (_, i) => i).filter((i) => !have.has(i));
    return {
      ok: false,
      error: `Upload incomplete: chunk${missing.length > 1 ? "s" : ""} ${missing.slice(0, 10).map((i) => i + 1).join(", ")}${missing.length > 10 ? "…" : ""} of ${session.totalChunks} never arrived.`,
    };
  }
  if (summary.rows !== session.totalRows) {
    return {
      ok: false,
      error: `Upload incomplete: ${summary.rows.toLocaleString("en-US")} of ${session.totalRows.toLocaleString("en-US")} rows arrived.`,
    };
  }

  // Claim the session so a double-click can't commit it twice.
  const claimed = await prisma.importSession.updateMany({
    where: {
      orgId,
      id: sessionId,
      OR: [{ status: "uploading" }, { status: "committing", updatedAt: { lt: new Date(Date.now() - STUCK_COMMIT_MS) } }],
    },
    data: { status: "committing" },
  });
  if (claimed.count === 0) return { ok: false, error: "This upload is already being saved." };

  let step: CommitStep = "validate";
  const onStep = async (s: CommitStep) => {
    step = s;
    await opts.onStep?.(s);
  };

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        await onStep("validate");
        const bad = await tx.$queryRawUnsafe<
          { entity: ImportEntity; col: string; target: ImportEntity; chunkIndex: number; rowNumber: number; value: string; kind: "ref" | "nocost"; total: bigint }[]
        >(referenceCheckSql(session.clearExisting), orgId, sessionId);
        if (bad.length > 0) return { refErrors: formatReferenceErrors(bad, session.clearExisting, session.totalChunks) };

        if (session.clearExisting) {
          await onStep("clear");
          await tx.transaction.deleteMany({ where: { orgId } });
          await tx.purchaseOrder.deleteMany({ where: { orgId } });
          await tx.inventory.deleteMany({ where: { orgId } });
          await tx.product.deleteMany({ where: { orgId } });
          await tx.supplier.deleteMany({ where: { orgId } });
          await tx.warehouse.deleteMany({ where: { orgId } });
        }

        let insertedTransactions = 0;
        for (const { step: s, sql } of COMMIT_STATEMENTS) {
          await onStep(s);
          const affected = await tx.$executeRawUnsafe(sql, orgId, sessionId);
          if (s === "transaction") insertedTransactions = affected;
        }

        const counts: ImportCounts = { ...summary.counts, transactions: insertedTransactions };
        const skipped = summary.counts.transactions - insertedTransactions;
        if (opts.simulate) throw new DemoRollback(counts, skipped);
        return { counts, skipped };
      },
      { timeout: COMMIT_TX_TIMEOUT_MS, maxWait: 10_000 }
    );

    if (outcome.refErrors) {
      await discardSession(orgId, sessionId);
      return { ok: false, error: outcome.refErrors.join("\n") };
    }

    await prisma.importSession.deleteMany({ where: { orgId, id: sessionId } });
    return { ok: true, counts: outcome.counts!, duplicateTransactionsSkipped: outcome.skipped!, simulated: false };
  } catch (err) {
    if (err instanceof DemoRollback) {
      await prisma.importSession.deleteMany({ where: { orgId, id: sessionId } });
      return { ok: true, counts: err.counts, duplicateTransactionsSkipped: err.skipped, simulated: true };
    }
    console.error(`[commitImportSession] failed at step "${step}":`, err);
    await discardSession(orgId, sessionId);
    const label = step === "validate" ? "checking the file" : step === "clear" ? "clearing existing data" : `saving ${ENTITY_LABELS[step]}`;
    return {
      ok: false,
      error: `Nothing was imported — saving failed while ${label}, so every change was rolled back. Reason: ${describeDbError(err)}`,
    };
  }
}

function formatReferenceErrors(
  bad: { entity: ImportEntity; col: string; target: ImportEntity; chunkIndex: number; rowNumber: number; value: string; kind: "ref" | "nocost"; total: bigint }[],
  clearExisting: boolean,
  totalChunks: number
): string[] {
  const errors = bad.map((r) =>
    formatRowError({
      chunkIndex: r.chunkIndex,
      totalChunks,
      entity: r.entity,
      rowNumber: r.rowNumber,
      column: r.col,
      problem:
        r.kind === "nocost"
          ? `is empty — ${r.value} is new${clearExisting ? "" : " to your workspace"}, so its unit cost is required (none is filled in for you).`
          : `"${r.value}" is not one of the ${ENTITY_LABELS[r.target]} in this file${clearExisting ? "" : " or your workspace"}.`,
    })
  );
  const total = Number(bad[0].total);
  if (total > errors.length) errors.push(`…and ${(total - errors.length).toLocaleString("en-US")} more rows with the same kind of problem.`);
  return errors;
}

/** Failed commit: drop the staged chunks, keep the session row (status "failed") for the 24h window. One statement. */
async function discardSession(orgId: string, sessionId: string) {
  await prisma.$executeRawUnsafe(
    `WITH gone AS (DELETE FROM import_staged_chunks WHERE org_id = $1 AND session_id = $2)
     UPDATE import_sessions SET status = 'failed', updated_at = now() WHERE org_id = $1 AND id = $2`,
    orgId,
    sessionId
  );
}

function describeDbError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2028") {
    return "the database took too long to save this many rows. Try splitting the file.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  // Prisma messages end with the useful driver error; keep them short.
  return msg.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 300) || "unknown database error.";
}
