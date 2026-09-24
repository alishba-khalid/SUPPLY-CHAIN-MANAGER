/**
 * Chunked smart import — pure tests always run; database tests run only when
 * TEST_DATABASE_URL is set (they write real rows, so they never fall back to
 * DATABASE_URL, which may be the hosted database):
 *
 *   npx prisma dev --name scm-import-test --detach      # throwaway local Postgres
 *   TEST_DATABASE_URL="postgres://postgres:postgres@localhost:51222/template1?sslmode=disable" \
 *     npx tsx --test src/lib/importer/__tests__/chunked-import.test.ts
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import {
  CHUNK_MAX_ROWS,
  buildChunks,
  flattenPayload,
  formatLimitNote,
  formatRowError,
  validateRow,
  type StagedTransaction,
} from "../chunked-import";
import { runChunkedImport, type ImportTransport } from "../chunked-upload";
import { readWorkbookBuffer } from "../reader";
import { resolveImportRowLimit, TRIAL_IMPORT_ROW_LIMIT, PLAN_DEFINITIONS } from "../../subscriptions/tiers";
import {
  ALL_IN_ONE_21586,
  REGRESSION_4817,
  buildAllInOneWorkbook,
  buildImportPayload,
  totalRows,
  type EntityCounts,
} from "../../../../fixtures/generate-large-import-fixture";

describe("chunked import — pure", () => {
  test("21,586-row payload splits into 11 chunks of at most 2,000 rows, in dependency order", () => {
    const rows = flattenPayload(buildImportPayload(ALL_IN_ONE_21586));
    assert.strictEqual(rows.length, 21_586);
    const chunks = buildChunks(rows);
    assert.strictEqual(chunks.length, 11);
    assert.ok(chunks.every((c) => c.rows.length <= CHUNK_MAX_ROWS));
    assert.ok(chunks.every((c) => JSON.stringify(c.rows).length < 1_500_000));
    const order = ["warehouse", "supplier", "product", "inventory", "purchase_order", "transaction"];
    const seen = rows.map((r) => order.indexOf(r.entity));
    assert.deepStrictEqual(seen, [...seen].sort((a, b) => a - b), "rows must be in dependency order");
  });

  test("identical transactions get distinct, reproducible import keys", () => {
    const payload = buildImportPayload(ALL_IN_ONE_21586);
    const keys = (p: typeof payload) =>
      flattenPayload(p)
        .filter((r) => r.entity === "transaction")
        .map((r) => (r.data as StagedTransaction).importKey);
    const first = keys(payload);
    assert.strictEqual(new Set(first).size, first.length, "every transaction row needs its own key");
    assert.deepStrictEqual(keys(buildImportPayload(ALL_IN_ONE_21586)), first, "same file => same keys");
  });

  test("row validation reports 'Row N, column X: problem'", () => {
    const problem = validateRow({ entity: "transaction", rowNumber: 7, data: { sku: "A", warehouseCode: "W", quantity: 3, direction: "IN", date: "2026-13-45", importKey: "k" } });
    assert.ok(problem);
    const msg = formatRowError({ chunkIndex: 3, totalChunks: 11, entity: "transaction", rowNumber: 1203, ...problem });
    assert.strictEqual(msg, 'Chunk 4 of 11, transactions row 1,203, column "date": "2026-13-45" is not a valid date (expected YYYY-MM-DD).');
  });

  test("per-plan limits come from config; org override beats the plan", () => {
    assert.strictEqual(TRIAL_IMPORT_ROW_LIMIT, 50_000);
    assert.strictEqual(resolveImportRowLimit({ plan: "growth", isDemoOrTrial: true }), 50_000);
    assert.strictEqual(resolveImportRowLimit({ plan: "starter", isDemoOrTrial: false }), 100_000);
    assert.strictEqual(resolveImportRowLimit({ plan: "growth", isDemoOrTrial: false }), 500_000);
    assert.strictEqual(resolveImportRowLimit({ plan: "professional", isDemoOrTrial: false }), 2_000_000);
    assert.strictEqual(PLAN_DEFINITIONS.professional.importRowLimit, 2_000_000);
    assert.strictEqual(resolveImportRowLimit({ plan: "growth", isDemoOrTrial: true, orgOverride: 250_000 }), 250_000);
    assert.strictEqual(
      formatLimitNote(63_000, 50_000),
      "This file has 63,000 rows. Your plan allows 50,000 per import. Split the file or upgrade."
    );
  });

  test("the 21,586-row six-sheet workbook parses in the browser reader without hitting a limit", () => {
    const sheets = readWorkbookBuffer(buildAllInOneWorkbook(ALL_IN_ONE_21586));
    const rows = sheets.reduce((n, s) => n + s.rawRows.length, 0);
    assert.strictEqual(rows, 21_586);
    assert.ok(rows <= TRIAL_IMPORT_ROW_LIMIT);
  });
});

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const TEST_DB = process.env.TEST_DATABASE_URL;

describe("chunked import — database", { skip: TEST_DB ? false : "set TEST_DATABASE_URL to run" }, () => {
  // Loaded lazily so DATABASE_URL is pointed at the test DB before Prisma connects.
  let prisma: typeof import("@/lib/prisma").prisma;
  let helpers: typeof import("./import-test-helpers");
  const run = `${Date.now().toString(36)}`;
  const orgs: string[] = [];
  const org = (name: string) => {
    const id = `org_test_${name}_${run}`;
    orgs.push(id);
    return id;
  };

  async function dbCounts(orgId: string): Promise<EntityCounts> {
    const [warehouses, suppliers, products, inventory, purchaseOrders, transactions] = await Promise.all([
      prisma.warehouse.count({ where: { orgId } }),
      prisma.supplier.count({ where: { orgId } }),
      prisma.product.count({ where: { orgId } }),
      prisma.inventory.count({ where: { orgId } }),
      prisma.purchaseOrder.count({ where: { orgId } }),
      prisma.transaction.count({ where: { orgId } }),
    ]);
    return { warehouses, suppliers, products, inventory, purchaseOrders, transactions };
  }

  const stagedRowsFor = (orgId: string) => prisma.importStagedChunk.count({ where: { orgId } });
  const EMPTY: EntityCounts = { warehouses: 0, suppliers: 0, products: 0, inventory: 0, purchaseOrders: 0, transactions: 0 };
  const FAST_RETRY = [5, 5, 5];

  before(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.DIRECT_URL = TEST_DB;
    ({ prisma } = await import("@/lib/prisma"));
    helpers = await import("./import-test-helpers");
  });

  after(async () => {
    if (!prisma) return;
    for (const orgId of orgs) {
      await prisma.importSession.deleteMany({ where: { orgId } });
      await prisma.transaction.deleteMany({ where: { orgId } });
      await prisma.purchaseOrder.deleteMany({ where: { orgId } });
      await prisma.inventory.deleteMany({ where: { orgId } });
      await prisma.product.deleteMany({ where: { orgId } });
      await prisma.supplier.deleteMany({ where: { orgId } });
      await prisma.warehouse.deleteMany({ where: { orgId } });
      await prisma.organization.deleteMany({ where: { orgId } });
    }
    await prisma.$disconnect();
  });

  test("21,586-row all-in-one file: succeeds, counts match", async () => {
    const orgId = org("big");
    const res = await helpers.importPayloadDirect(orgId, buildImportPayload(ALL_IN_ONE_21586), true);
    assert.ok(res.ok, res.ok ? "" : res.error);
    assert.deepStrictEqual(await dbCounts(orgId), ALL_IN_ONE_21586);
    assert.strictEqual(res.counts.transactions, 20_375);
    assert.strictEqual(await stagedRowsFor(orgId), 0, "staged rows are cleared after commit");
    assert.strictEqual(await prisma.importSession.count({ where: { orgId } }), 0);
  });

  test("4,817-row file: succeeds (regression)", async () => {
    const orgId = org("regression");
    assert.strictEqual(totalRows(REGRESSION_4817), 4_817);
    const res = await helpers.importPayloadDirect(orgId, buildImportPayload(REGRESSION_4817), true);
    assert.ok(res.ok, res.ok ? "" : res.error);
    assert.deepStrictEqual(await dbCounts(orgId), REGRESSION_4817);
  });

  test("failure injected at the transactions step: nothing is left in the database", async () => {
    // A temporary trigger makes the transactions INSERT fail on its 10,000th
    // row — mid-statement, after warehouses, suppliers, products, inventory
    // and purchase orders were already written inside the same transaction.
    // The trigger reports what the transaction could see at that moment, so
    // the test proves those rows existed and were then rolled back.
    const installFailAtRow10000 = async (orgId: string) => {
      await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS test_fail_tx_seq`);
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE test_fail_tx_seq RESTART WITH 1`);
      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION test_fail_mid_transactions() RETURNS trigger AS $$
        BEGIN
          IF NEW.org_id = '${orgId}' AND nextval('test_fail_tx_seq') = 10000 THEN
            RAISE EXCEPTION 'injected failure at transaction row 10000; inside tx: warehouses=% suppliers=% products=% inventory=% purchase_orders=%',
              (SELECT count(*) FROM warehouses WHERE org_id = NEW.org_id),
              (SELECT count(*) FROM suppliers WHERE org_id = NEW.org_id),
              (SELECT count(*) FROM products WHERE org_id = NEW.org_id),
              (SELECT count(*) FROM inventory WHERE org_id = NEW.org_id),
              (SELECT count(*) FROM purchase_orders WHERE org_id = NEW.org_id);
          END IF;
          RETURN NEW;
        END $$ LANGUAGE plpgsql`);
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS test_fail_mid_tx ON transactions`);
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER test_fail_mid_tx BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION test_fail_mid_transactions()`
      );
    };
    const dropTrigger = async () => {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS test_fail_mid_tx ON transactions`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS test_fail_mid_transactions()`);
      await prisma.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS test_fail_tx_seq`);
    };
    const report = async (label: string, orgId: string) => {
      const c = { ...(await dbCounts(orgId)), stagedRows: await stagedRowsFor(orgId) };
      console.log(`[rollback] ${label}: ${JSON.stringify(c)}`);
      return c;
    };

    const fresh = org("rollback_fresh");
    const existing = org("rollback_existing");
    const seeded = await helpers.importPayloadDirect(existing, buildImportPayload(REGRESSION_4817), true);
    assert.ok(seeded.ok, seeded.ok ? "" : seeded.error);

    try {
      // (a) Empty org, merge mode.
      await report("fresh BEFORE", fresh);
      await installFailAtRow10000(fresh);
      const res = await runChunkedImport(buildImportPayload(ALL_IN_ONE_21586), false, helpers.directTransport(fresh));
      assert.strictEqual(res.ok, false);
      const error = res.ok ? "" : res.error;
      console.log(`[rollback] fresh ERROR: ${error}`);
      assert.match(error, /Nothing was imported/);
      assert.match(error, /saving transactions/);
      assert.match(
        error,
        /inside tx: warehouses=3 suppliers=8 products=250 inventory=466 purchase_orders=484/,
        "earlier steps were written inside the transaction before the failure"
      );
      assert.deepStrictEqual(await report("fresh AFTER", fresh), { ...EMPTY, stagedRows: 0 });

      // (b) Org with data, replace mode: the delete of the old data must roll back too.
      await report("existing BEFORE", existing);
      await installFailAtRow10000(existing);
      const replace = await runChunkedImport(buildImportPayload(ALL_IN_ONE_21586), true, helpers.directTransport(existing));
      assert.strictEqual(replace.ok, false);
      assert.deepStrictEqual(await report("existing AFTER", existing), { ...REGRESSION_4817, stagedRows: 0 }, "previous data untouched");
    } finally {
      await dropTrigger();
    }
  });

  test("same file imported twice: row counts unchanged", async () => {
    const orgId = org("twice");
    const payload = buildImportPayload(ALL_IN_ONE_21586);
    const first = await helpers.importPayloadDirect(orgId, payload, false);
    assert.ok(first.ok, first.ok ? "" : first.error);
    const afterFirst = await dbCounts(orgId);

    const second = await helpers.importPayloadDirect(orgId, payload, false);
    assert.ok(second.ok, second.ok ? "" : second.error);
    assert.deepStrictEqual(await dbCounts(orgId), afterFirst);
    assert.deepStrictEqual(afterFirst, ALL_IN_ONE_21586);
    assert.strictEqual(second.counts.transactions, 0);
    assert.strictEqual(second.duplicateTransactionsSkipped, 20_375);
  });

  test("connection killed after chunk 3: resume works", async () => {
    const payload = buildImportPayload(ALL_IN_ONE_21586);

    // (a) Transient drop: chunk 4's request dies twice, and on the third try
    // the chunk lands but the response is lost. The loop must resume without
    // re-sending chunks 1–3.
    const orgA = org("resume_transient");
    const base = helpers.directTransport(orgA);
    const sent: number[] = [];
    let chunk4Attempts = 0;
    const flaky: ImportTransport = {
      ...base,
      stage: async (sessionId, chunkIndex, rows) => {
        if (chunkIndex === 3 && chunk4Attempts++ < 3) {
          if (chunk4Attempts === 3) await base.stage(sessionId, chunkIndex, rows); // landed, response lost
          throw new TypeError("fetch failed");
        }
        sent.push(chunkIndex);
        return base.stage(sessionId, chunkIndex, rows);
      },
    };
    const progress: string[] = [];
    const res = await runChunkedImport(payload, true, flaky, {
      retryDelaysMs: FAST_RETRY,
      onProgress: (p) => progress.push(p.reconnecting ? "reconnecting" : p.phase),
    });
    assert.ok(res.ok, res.ok ? "" : res.error);
    assert.deepStrictEqual(sent, [0, 1, 2, 4, 5, 6, 7, 8, 9, 10], "chunks 1-3 were not re-sent; chunk 4 was recovered from the server");
    assert.ok(progress.includes("reconnecting"));
    assert.deepStrictEqual(await dbCounts(orgA), ALL_IN_ONE_21586);

    // (b) Connection gone for good after chunk 3 (tab closed / offline).
    // Choosing the same file again later resumes at chunk 4.
    const orgB = org("resume_reload");
    const baseB = helpers.directTransport(orgB);
    const dead: ImportTransport = {
      ...baseB,
      stage: async (s, i, rows) => {
        if (i >= 3) throw new TypeError("fetch failed");
        return baseB.stage(s, i, rows);
      },
      status: async () => {
        throw new TypeError("fetch failed");
      },
    };
    const dropped = await runChunkedImport(payload, true, dead, { retryDelaysMs: FAST_RETRY });
    assert.strictEqual(dropped.ok, false);
    assert.match(dropped.ok ? "" : dropped.error, /resume from chunk 4/);
    assert.deepStrictEqual(await dbCounts(orgB), EMPTY, "nothing reaches the real tables before commit");

    const resentB: number[] = [];
    const progressB: boolean[] = [];
    const resumed = await runChunkedImport(
      payload,
      true,
      { ...baseB, stage: (s, i, rows) => (resentB.push(i), baseB.stage(s, i, rows)) },
      { onProgress: (p) => progressB.push(Boolean(p.resumed)) }
    );
    assert.ok(resumed.ok, resumed.ok ? "" : resumed.error);
    assert.deepStrictEqual(resentB, [3, 4, 5, 6, 7, 8, 9, 10]);
    assert.ok(progressB.includes(true));
    assert.deepStrictEqual(await dbCounts(orgB), ALL_IN_ONE_21586);
  });

  test("org A's import never appears in org B", async () => {
    const orgA = org("iso_a");
    const orgB = org("iso_b");
    const resB = await helpers.importPayloadDirect(orgB, buildImportPayload(REGRESSION_4817), true);
    assert.ok(resB.ok);
    const before = await dbCounts(orgB);
    assert.deepStrictEqual(before, REGRESSION_4817);

    // A imports the SAME SKUs / codes / PO numbers in replace mode (which
    // deletes A's existing data first). Keys are unique per org, so B must be
    // untouched: no upsert onto B's rows, no delete of B's rows.
    const resA = await helpers.importPayloadDirect(orgA, buildImportPayload(ALL_IN_ONE_21586), true);
    assert.ok(resA.ok);
    assert.deepStrictEqual(await dbCounts(orgA), ALL_IN_ONE_21586);
    assert.deepStrictEqual(await dbCounts(orgB), before);

    // B cannot see, stage into, commit or cancel A's upload session.
    const transportA = helpers.directTransport(orgA);
    const rows = flattenPayload(buildImportPayload(REGRESSION_4817, "X-"));
    const chunks = buildChunks(rows);
    const beginA = await transportA.begin({ fingerprint: "a".repeat(64), totalRows: rows.length, totalChunks: chunks.length, clearExisting: false });
    assert.ok(beginA.ok);
    const transportB = helpers.directTransport(orgB);
    assert.strictEqual((await transportB.status(beginA.sessionId)).ok, false);
    assert.strictEqual((await transportB.stage(beginA.sessionId, 0, chunks[0].rows)).ok, false);
    assert.strictEqual((await transportB.commit(beginA.sessionId)).ok, false);
    await transportB.cancel(beginA.sessionId);
    assert.strictEqual((await transportA.status(beginA.sessionId)).ok, true, "B's cancel did not touch A's session");
    await transportA.cancel(beginA.sessionId);
    assert.deepStrictEqual(await dbCounts(orgB), before);
  });

  test("file over the plan limit: clean grey message, nothing written", async () => {
    const orgId = org("limit");
    const over: EntityCounts = { ...ALL_IN_ONE_21586, transactions: 63_000 - 1_211 };
    assert.strictEqual(totalRows(over), 63_000);
    const res = await helpers.importPayloadDirect(orgId, buildImportPayload(over), true);
    assert.strictEqual(res.ok, false);
    if (res.ok) return;
    assert.deepStrictEqual(res.limitExceeded, { rows: 63_000, limit: 50_000 }, "flagged as a limit (grey note), not an error");
    assert.strictEqual(res.error, "This file has 63,000 rows. Your plan allows 50,000 per import. Split the file or upgrade.");
    assert.deepStrictEqual(await dbCounts(orgId), EMPTY);
    assert.strictEqual(await prisma.importSession.count({ where: { orgId } }), 0);
    assert.strictEqual(await stagedRowsFor(orgId), 0);

    // An org-level override lifts the limit for that org only.
    await prisma.organization.create({ data: { orgId, importRowLimitOverride: 100_000 } });
    const transport = helpers.directTransport(orgId);
    const begin = await transport.begin({ fingerprint: "b".repeat(64), totalRows: 63_000, totalChunks: 32, clearExisting: true });
    assert.ok(begin.ok, "override allows 63,000 rows");
    await transport.cancel(begin.sessionId);
    const other = helpers.directTransport(org("limit_other"));
    const otherBegin = await other.begin({ fingerprint: "c".repeat(64), totalRows: 63_000, totalChunks: 32, clearExisting: true });
    assert.strictEqual(otherBegin.ok, false, "other orgs keep the plan limit");
  });

  test("stale staged uploads older than 24 hours are cleaned up", async () => {
    const orgId = org("stale");
    const transport = helpers.directTransport(orgId);
    const rows = flattenPayload(buildImportPayload(REGRESSION_4817));
    const chunks = buildChunks(rows);
    const begin = await transport.begin({ fingerprint: "d".repeat(64), totalRows: rows.length, totalChunks: chunks.length, clearExisting: false });
    assert.ok(begin.ok);
    await transport.stage(begin.sessionId, 0, chunks[0].rows);
    await prisma.importSession.updateMany({ where: { orgId }, data: { createdAt: new Date(Date.now() - 25 * 3600_000) } });
    const { cleanupStaleImportSessions } = await import("@/data/repositories/import-staging");
    assert.ok((await cleanupStaleImportSessions(orgId)) >= 1);
    assert.strictEqual(await stagedRowsFor(orgId), 0);
  });

  test("a stock-only import never overwrites existing products, suppliers or warehouses", async () => {
    const orgId = org("refonly");
    const full = buildImportPayload(REGRESSION_4817);
    const seeded = await helpers.importPayloadDirect(orgId, full, true);
    assert.ok(seeded.ok, seeded.ok ? "" : seeded.error);
    const snapshot = async () => ({
      products: await prisma.product.findMany({ where: { orgId }, select: { sku: true, name: true, unitCost: true, supplierId: true }, orderBy: { sku: "asc" } }),
      suppliers: await prisma.supplier.findMany({ where: { orgId }, select: { supplierId: true, name: true, leadTimeDays: true, email: true }, orderBy: { supplierId: "asc" } }),
      warehouses: await prisma.warehouse.findMany({ where: { orgId }, select: { code: true, name: true, capacityUnits: true }, orderBy: { code: "asc" } }),
    });
    const before = await snapshot();

    // What the extractor produces for an inventory-only file: everything
    // except the stock rows is a reference-only placeholder.
    const stockOnly = {
      warehouses: full.warehouses.map((w) => ({ code: w.code, name: w.code, capacityUnits: 0, referenceOnly: true })),
      suppliers: [{ supplierId: "SUP-UNASSIGNED", name: "Unassigned Supplier", leadTimeDays: 14, email: "unassigned@company.internal", leadTimeMissing: true, referenceOnly: true }],
      products: full.products.map((p) => ({ sku: p.sku, name: p.sku, category: "General", unitCost: 0, supplierId: "SUP-UNASSIGNED", referenceOnly: true })),
      inventory: full.inventory.map((i) => ({ ...i, quantityOnHand: i.quantityOnHand + 1 })),
      purchaseOrders: [],
      transactions: [],
    };
    const res = await helpers.importPayloadDirect(orgId, stockOnly, false);
    assert.ok(res.ok, res.ok ? "" : res.error);

    const after = await snapshot();
    assert.deepStrictEqual(after, before, "names, costs, suppliers, lead times and capacities are untouched");
    assert.strictEqual(res.counts.products, 0, "placeholders are not reported as imported products");
    const stock = await prisma.inventory.findFirst({ where: { orgId, sku: full.inventory[0].sku } });
    assert.strictEqual(stock?.quantityOnHand, full.inventory[0].quantityOnHand + 1, "the stock rows themselves were applied");
  });

  test("a row pointing at an unknown product fails with its row number, nothing written", async () => {
    const orgId = org("badref");
    const payload = buildImportPayload(REGRESSION_4817);
    payload.transactions[1202] = { ...payload.transactions[1202], sku: "SKU-DOES-NOT-EXIST" };
    const res = await helpers.importPayloadDirect(orgId, payload, true);
    assert.strictEqual(res.ok, false);
    assert.match(res.ok ? "" : res.error, /transactions row 1,203, column "sku": "SKU-DOES-NOT-EXIST" is not one of the products/);
    assert.deepStrictEqual(await dbCounts(orgId), EMPTY);
  });
});
