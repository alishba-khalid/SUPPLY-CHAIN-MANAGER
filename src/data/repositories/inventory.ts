import type {
  InventoryInsight,
  InventoryRecord,
  InventoryTableParams,
  InventoryTableResult,
  InventoryTableRow,
  InventoryTransaction,
} from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { toISODate } from "@/lib/dates";
import { buildInventoryInsight, inventoryHealthScore } from "@/lib/metrics/inventory";

export async function getInventoryRecords(orgId: string): Promise<InventoryRecord[]> {
  return prisma.inventory.findMany({ where: { orgId }, orderBy: { sku: "asc" } });
}

export async function getInventoryTransactions(
  orgId: string,
  filter?: {
    sku?: string;
    warehouseId?: number;
  },
): Promise<InventoryTransaction[]> {
  const rows = await prisma.transaction.findMany({
    where: { orgId, sku: filter?.sku, warehouseId: filter?.warehouseId },
    orderBy: { date: "asc" },
  });
  return rows.map((t) => ({ ...t, date: toISODate(t.date) }));
}

/** One insight per (product, warehouse) pair currently carrying stock. */
export async function getInventoryInsights(orgId: string): Promise<InventoryInsight[]> {
  const [records, transactions, products, suppliers] = await Promise.all([
    getInventoryRecords(orgId),
    getInventoryTransactions(orgId),
    prisma.product.findMany({ where: { orgId } }),
    prisma.supplier.findMany({ where: { orgId } }),
  ]);
  const supplierBySkuOwner = new Map(products.map((p) => [p.sku, p.supplierId]));
  const leadTimeBySupplierId = new Map(suppliers.map((s) => [s.supplierId, s.leadTimeDays]));

  return records.map((record) => {
    const supplierId = supplierBySkuOwner.get(record.sku);
    const leadTimeDays = (supplierId !== undefined ? leadTimeBySupplierId.get(supplierId) : undefined) ?? 14;
    return buildInventoryInsight(transactions, record, leadTimeDays);
  });
}

export async function getInventoryHealthScore(orgId: string): Promise<number> {
  const insights = await getInventoryInsights(orgId);
  return inventoryHealthScore(insights);
}

export async function getTotalInventoryValue(orgId: string): Promise<number> {
  const [records, products] = await Promise.all([getInventoryRecords(orgId), prisma.product.findMany({ where: { orgId } })]);
  const costBySku = new Map(products.map((p) => [p.sku, Number(p.unitCost)]));
  const total = records.reduce((sum, r) => sum + r.quantityOnHand * (costBySku.get(r.sku) ?? 0), 0);
  return Math.round(total * 100) / 100;
}

// ============================================================
// Inventory Table — query-side pagination, filtering, sorting, ABC
// classification. See docs/metrics.md's "Inventory Table" section for the
// full formula writeup; every CASE/window function below mirrors it
// exactly, comment-for-comment.
//
// This is computed with raw SQL (not the Prisma query builder, and not the
// in-memory getInventoryInsights() above) because ABC classification needs
// a cumulative-percentage rank over the *entire* dataset before any filter
// or page is applied — a window function over the whole table, done once
// in Postgres, is the only way to keep this correct at 10,000+ SKUs without
// pulling every row into Node on every request.
// ============================================================

const DEFAULT_PAGE_SIZE = 50;
const SAFETY_FACTOR = 0.5; // safety_stock = avg_daily_demand × lead_time_days × this factor
const OVERSTOCK_DAYS_OF_STOCK = 90; // days_of_stock beyond this => overstock
const TRAILING_WINDOW_DAYS = 90; // matches the trailing window used everywhere else in the app
// Same outlier trimming as trimmedDailyDemand() in lib/metrics/inventory.ts, so
// the table's daily demand (and days until stockout) equals the one used by
// alerts and the forecast engine.
const TRIM_PERCENT = 0.05;
const MIN_ACTIVE_DAYS_TO_TRIM = 20;

/**
 * The shared calculation chain, one CTE per step so each can reference the
 * previous step's plain (non-recomputed) columns:
 *
 *   base       — raw joins: one row per (sku, warehouse), plus the earliest
 *                transaction date and trailing-90-day outbound quantity.
 *   demand     — days_of_history = min(90, calendar days from the earliest
 *                transaction through today, inclusive) — the literal "use the
 *                days available" edge case, same as daysOfDemandHistory() in
 *                lib/metrics/inventory.ts. 0 when there is no transaction
 *                history at all.
 *   daily/ranked/outbound_stats — per-day outbound totals over the trailing
 *                90 days, ranked so the top and bottom 5% of selling days can
 *                be dropped (only with 20+ selling days).
 *   calc       — avg_daily_demand = (trimmed) outbound_90d / days_of_history,
 *                rounded to 2 decimals — identical to trimmedDailyDemand() in
 *                lib/metrics/inventory.ts. Note the outbound sum is *always*
 *                over the actual trailing 90 days (never re-windowed) — if the
 *                pair's history is shorter than 90 days there is nothing to sum
 *                before it existed anyway, so only the divisor changes.
 *   calc2      — days_of_stock = on_hand / avg_daily_demand (null when
 *                demand is null/0 — "infinite" is displayed, never computed).
 *                safety_stock = avg_daily_demand × lead_time_days × 0.5,
 *                null when lead_time_days is unknown (no silent default).
 *   calc3      — reorder_point = (avg_daily_demand × lead_time_days) +
 *                safety_stock, null under the same condition as safety_stock.
 *   classified — stock_status, most-specific-wins:
 *                  no history at all, or confirmed zero demand over the
 *                  window            -> dead_stock
 *                  on_hand < reorder_point (only computable with a lead
 *                  time on record)    -> understock
 *                  days_of_stock > 90 -> overstock
 *                  reorder_point unknown (no lead time, and not already
 *                  overstock)         -> unknown  (never silently "healthy")
 *                  otherwise          -> healthy
 *   banded     — demand_value = avg_daily_demand × unit_cost (a $/day rate);
 *                a running cumulative sum of demand_value, ordered
 *                descending, gives each row's position in the whole
 *                dataset's demand-value ranking.
 *   scored     — abc_class from the cumulative %: A <= 80%, B <= 95%, else C.
 *                Null for rows with no demand value (nothing to rank).
 */
function scoredCte(orgId: string): Prisma.Sql {
  return Prisma.sql`
  daily AS (
    SELECT sku, warehouse_id, date, SUM(quantity) AS q
    FROM transactions
    WHERE org_id = ${orgId} AND direction = 'OUT'
      AND date > CURRENT_DATE - (INTERVAL '1 day' * ${TRAILING_WINDOW_DAYS}) AND date <= CURRENT_DATE
    GROUP BY sku, warehouse_id, date
    HAVING SUM(quantity) > 0
  ),
  ranked AS (
    SELECT sku, warehouse_id, q,
      ROW_NUMBER() OVER (PARTITION BY sku, warehouse_id ORDER BY q) AS rn,
      COUNT(*) OVER (PARTITION BY sku, warehouse_id) AS n
    FROM daily
  ),
  outbound_stats AS (
    SELECT sku, warehouse_id,
      MAX(n) AS "activeDays",
      SUM(q) AS "outboundSum",
      SUM(q) FILTER (WHERE rn > FLOOR(n * ${TRIM_PERCENT}::numeric) AND rn <= n - FLOOR(n * ${TRIM_PERCENT}::numeric)) AS "trimmedSum",
      COUNT(*) FILTER (WHERE rn > FLOOR(n * ${TRIM_PERCENT}::numeric) AND rn <= n - FLOOR(n * ${TRIM_PERCENT}::numeric)) AS "trimmedDays"
    FROM ranked
    GROUP BY sku, warehouse_id
  ),
  base AS (
    SELECT
      i.sku,
      i.warehouse_id AS "warehouseId",
      i.quantity_on_hand AS "quantityOnHand",
      p.name AS "productName",
      p.category,
      p.unit_cost AS "unitCost",
      p.supplier_id AS "supplierId",
      s.name AS "supplierName",
      s.lead_time_days AS "leadTimeDays",
      w.code AS "warehouseCode",
      w.name AS "warehouseName",
      MIN(t.date) FILTER (WHERE t.date <= CURRENT_DATE) AS "earliestTxnDate",
      COALESCE(os."outboundSum", 0) AS "outbound90d",
      COALESCE(os."activeDays", 0) AS "activeDays",
      os."trimmedSum",
      os."trimmedDays"
    FROM inventory i
    JOIN products p ON p.sku = i.sku AND p.org_id = i.org_id
    LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id AND s.org_id = p.org_id
    JOIN warehouses w ON w.id = i.warehouse_id AND w.org_id = i.org_id
    LEFT JOIN transactions t ON t.sku = i.sku AND t.warehouse_id = i.warehouse_id AND t.org_id = i.org_id
    LEFT JOIN outbound_stats os ON os.sku = i.sku AND os.warehouse_id = i.warehouse_id
    WHERE i.org_id = ${orgId}
    GROUP BY i.sku, i.warehouse_id, i.quantity_on_hand, p.name, p.category, p.unit_cost, p.supplier_id, s.name, s.lead_time_days, w.code, w.name,
             os."outboundSum", os."activeDays", os."trimmedSum", os."trimmedDays"
  ),
  demand AS (
    SELECT *,
      CASE WHEN "earliestTxnDate" IS NULL THEN 0
           ELSE LEAST(${TRAILING_WINDOW_DAYS}, (CURRENT_DATE - "earliestTxnDate"::date) + 1)
      END AS "daysOfHistory"
    FROM base
  ),
  calc AS (
    SELECT *,
      CASE
        WHEN "daysOfHistory" = 0 THEN NULL
        WHEN "activeDays" = 0 THEN 0
        WHEN "activeDays" < ${MIN_ACTIVE_DAYS_TO_TRIM} OR "trimmedDays" = 0
          THEN ROUND("outbound90d"::numeric / "daysOfHistory", 2)
        ELSE ROUND(("trimmedSum"::numeric / "trimmedDays") * "activeDays" / "daysOfHistory", 2)
      END AS "avgDailyDemand"
    FROM demand
  ),
  calc2 AS (
    SELECT *,
      CASE WHEN "avgDailyDemand" IS NOT NULL AND "avgDailyDemand" > 0
           THEN "quantityOnHand"::numeric / "avgDailyDemand" ELSE NULL END AS "daysOfStock",
      CASE WHEN "avgDailyDemand" IS NOT NULL AND "leadTimeDays" IS NOT NULL
           THEN "avgDailyDemand" * "leadTimeDays" * ${SAFETY_FACTOR} ELSE NULL END AS "safetyStock"
    FROM calc
  ),
  calc3 AS (
    SELECT *,
      CASE WHEN "avgDailyDemand" IS NOT NULL AND "leadTimeDays" IS NOT NULL
           THEN ("avgDailyDemand" * "leadTimeDays") + "safetyStock" ELSE NULL END AS "reorderPoint"
    FROM calc2
  ),
  classified AS (
    SELECT *,
      CASE
        WHEN "daysOfHistory" = 0 THEN 'dead_stock'
        WHEN "avgDailyDemand" = 0 THEN 'dead_stock'
        WHEN "reorderPoint" IS NOT NULL AND "quantityOnHand" < "reorderPoint" THEN 'understock'
        WHEN "daysOfStock" IS NOT NULL AND "daysOfStock" > ${OVERSTOCK_DAYS_OF_STOCK} THEN 'overstock'
        WHEN "reorderPoint" IS NULL THEN 'unknown'
        ELSE 'healthy'
      END AS "status",
      CASE WHEN "avgDailyDemand" IS NOT NULL THEN "avgDailyDemand" * "unitCost" ELSE NULL END AS "demandValue"
    FROM calc3
  ),
  banded AS (
    SELECT *,
      SUM(COALESCE("demandValue", 0)) OVER (ORDER BY "demandValue" DESC NULLS LAST, sku, "warehouseId" ROWS UNBOUNDED PRECEDING) AS "runningTotal",
      SUM(COALESCE("demandValue", 0)) OVER () AS "grandTotal"
    FROM classified
  ),
  scored AS (
    SELECT *,
      CASE
        WHEN "demandValue" IS NULL OR "demandValue" = 0 OR "grandTotal" = 0 THEN NULL
        WHEN "runningTotal" / "grandTotal" <= 0.80 THEN 'A'
        WHEN "runningTotal" / "grandTotal" <= 0.95 THEN 'B'
        ELSE 'C'
      END AS "abcClass"
    FROM banded
  )
`;
}

function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

const SORT_COLUMNS: Record<NonNullable<InventoryTableParams["sortKey"]>, Prisma.Sql> = {
  status: Prisma.sql`CASE "status" WHEN 'understock' THEN 0 WHEN 'overstock' THEN 1 WHEN 'dead_stock' THEN 2 WHEN 'unknown' THEN 3 ELSE 4 END`,
  sku: Prisma.sql`sku`,
  name: Prisma.sql`"productName"`,
  warehouse: Prisma.sql`"warehouseCode"`,
  onHand: Prisma.sql`"quantityOnHand"`,
  daysOfStock: Prisma.sql`"daysOfStock"`,
  reorderPoint: Prisma.sql`"reorderPoint"`,
};

/** Raw driver values for numeric/bigint SQL types vary (Decimal instance, string, or number) — coerce, don't assume. */
type Numeric = number | string | Prisma.Decimal;

interface ScoredRow {
  sku: string;
  warehouseId: number;
  quantityOnHand: number;
  productName: string;
  category: string;
  unitCost: Numeric;
  supplierId: string | null;
  supplierName: string | null;
  leadTimeDays: number | null;
  warehouseCode: string;
  warehouseName: string;
  daysOfHistory: number;
  avgDailyDemand: Numeric | null;
  daysOfStock: Numeric | null;
  safetyStock: Numeric | null;
  reorderPoint: Numeric | null;
  status: InventoryTableRow["status"];
  abcClass: InventoryTableRow["abcClass"];
  totalMatching: Numeric;
}

function toNumberOrNull(v: Numeric | null): number | null {
  return v === null ? null : Number(v);
}

function toRow(r: ScoredRow): InventoryTableRow {
  return {
    sku: r.sku,
    productName: r.productName,
    category: r.category,
    warehouseId: r.warehouseId,
    warehouseCode: r.warehouseCode,
    warehouseName: r.warehouseName,
    supplierId: r.supplierId,
    supplierName: r.supplierName,
    quantityOnHand: r.quantityOnHand,
    unitCost: Number(r.unitCost),
    leadTimeDays: r.leadTimeDays,
    daysOfHistory: r.daysOfHistory,
    avgDailyDemand: toNumberOrNull(r.avgDailyDemand),
    daysOfStock: toNumberOrNull(r.daysOfStock),
    safetyStock: toNumberOrNull(r.safetyStock),
    reorderPoint: toNumberOrNull(r.reorderPoint),
    status: r.status,
    abcClass: r.abcClass,
  };
}

export async function getInventoryTable(orgId: string, params: InventoryTableParams = {}): Promise<InventoryTableResult> {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * pageSize;

  const filters: Prisma.Sql[] = [];
  if (params.warehouseId !== undefined) filters.push(Prisma.sql`"warehouseId" = ${params.warehouseId}`);
  if (params.status) filters.push(Prisma.sql`"status" = ${params.status}`);
  if (params.abcClass) filters.push(Prisma.sql`"abcClass" = ${params.abcClass}`);
  if (params.supplierId) filters.push(Prisma.sql`"supplierId" = ${params.supplierId}`);
  if (params.search) {
    const pattern = `%${escapeLikePattern(params.search)}%`;
    filters.push(Prisma.sql`(sku ILIKE ${pattern} ESCAPE '\\' OR "productName" ILIKE ${pattern} ESCAPE '\\')`);
  }
  const whereClause = filters.length > 0 ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}` : Prisma.empty;

  const sortColumn = SORT_COLUMNS[params.sortKey ?? "status"];
  const sortDir = params.sortDir === "desc" ? Prisma.sql`DESC` : Prisma.sql`ASC`;

  const [rows, summaryRows, transactionCount] = await Promise.all([
    prisma.$queryRaw<ScoredRow[]>`
      WITH ${scoredCte(orgId)}
      SELECT *, COUNT(*) OVER() AS "totalMatching"
      FROM scored
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDir} NULLS LAST, sku ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    prisma.$queryRaw<{ totalRows: Numeric; understockCount: Numeric; overstockCount: Numeric; deadStockCount: Numeric }[]>`
      WITH ${scoredCte(orgId)}
      SELECT
        COUNT(*) AS "totalRows",
        COUNT(*) FILTER (WHERE "status" = 'understock') AS "understockCount",
        COUNT(*) FILTER (WHERE "status" = 'overstock') AS "overstockCount",
        COUNT(*) FILTER (WHERE "status" = 'dead_stock') AS "deadStockCount"
      FROM scored
    `,
    prisma.transaction.count({ where: { orgId } }),
  ]);

  const summary = summaryRows[0] ?? { totalRows: 0, understockCount: 0, overstockCount: 0, deadStockCount: 0 };

  return {
    rows: rows.map(toRow),
    totalMatching: rows.length > 0 ? Number(rows[0].totalMatching) : 0,
    summary: {
      totalRows: Number(summary.totalRows),
      understockCount: Number(summary.understockCount),
      overstockCount: Number(summary.overstockCount),
      deadStockCount: Number(summary.deadStockCount),
    },
    hasAnyTransactionHistory: transactionCount > 0,
  };
}
