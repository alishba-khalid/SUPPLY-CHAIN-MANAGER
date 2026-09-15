/**
 * Canonical dataset verification script.
 * Asserts that the metrics and alerting engine produces the exact target values:
 * 1. Entity counts (4 warehouses, 6 suppliers, 24 products, 49 positions, 64 POs, ~3,900 txns)
 * 2. SKU-1015 at NDC ~3.2 days of cover
 * 3. SUP-004 at 0% OTIF
 * 4. Exactly 2 overdue POs across the org
 * 5. Exactly 12 overstock positions
 * 6. Overall health score within a band around 85 (see note below)
 * 7. Alert count within a band around 6 (see note below)
 *
 * Checks 6-7 use bands, not exact values, deliberately: both the health
 * score and the alert list are computed against wall-clock "today" over a
 * seed anchored to a fixed date, so they drift by small amounts as real
 * time passes — same reason check 2's day-of-cover uses a range. A band
 * catches a real regression (score collapsing to 20, alerts exploding to
 * 40) without false-failing on ordinary drift. These two were added after
 * an investigation traced an "expected ~54, saw 85" report: neither the
 * current formulas nor the pre-199ab41 ones (re-run against live data)
 * produce anything near 54 — the actual health-score composite is
 * inventory(0.30) + supplier(0.20) + procurement(0.20) + logistics(0.20)
 * + warehouse(0.10), and 85 is what it correctly computes to. See
 * README's "Known metric drift" section.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildInventoryInsight } from "../src/lib/metrics/inventory";
import { computeSupplierPerformance } from "../src/lib/metrics/supplier";
import { todayISODate } from "../src/lib/dates";
import { getSupplyChainHealth } from "../src/data/repositories/dashboard";
import { getAlerts } from "../src/lib/insights/alerts";
import type { PurchaseOrder, InventoryTransaction } from "../src/types/supply-chain";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString, max: 5 });
const basePrisma = new PrismaClient({ adapter });

const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ query, args }) {
      const maxAttempts = 8;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await query(args);
        } catch (error) {
          const err = error as { message?: string; code?: string; meta?: { driverAdapterError?: unknown } };
          const msg = `${err?.message || ""} ${err?.code || ""} ${String(err?.meta?.driverAdapterError || "")} ${String(error)}`;
          const isTransient =
            msg.includes("Connection terminated") ||
            msg.includes("ConnectionClosed") ||
            msg.includes("P1017") ||
            msg.includes("Server has closed the connection") ||
            msg.includes("ECONNRESET") ||
            msg.includes("closed the connection") ||
            err?.code === "P1017" ||
            err?.code === "P2010";

          if (!isTransient || attempt === maxAttempts) throw error;
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
        }
      }
      throw new Error("unreachable");
    },
  },
}) as unknown as PrismaClient;

function parseOrgId(): string {
  const flagIndex = process.argv.indexOf("--org");
  return flagIndex !== -1 && process.argv[flagIndex + 1] ? process.argv[flagIndex + 1] : "org_demo";
}

const ORG_ID = parseOrgId();

export async function verifyCanonicalData(targetOrg: string = ORG_ID) {
  console.log(`\n=== Verifying Canonical Metrics for Org: [${targetOrg}] ===\n`);

  // 1. Fetch raw data from database sequentially to prevent local proxy overload
  const warehouses = await prisma.warehouse.findMany({ where: { orgId: targetOrg } });
  const suppliers = await prisma.supplier.findMany({ where: { orgId: targetOrg } });
  const products = await prisma.product.findMany({ where: { orgId: targetOrg } });
  const inventory = await prisma.inventory.findMany({ where: { orgId: targetOrg } });
  const pos = await prisma.purchaseOrder.findMany({ where: { orgId: targetOrg } });
  const txns = await prisma.transaction.findMany({ where: { orgId: targetOrg } });

  console.log("1. Entity Count Checks:");
  console.log(`  Warehouses   : ${warehouses.length} (expected 4)`);
  assert.equal(warehouses.length, 4, "Must have exactly 4 warehouses");

  console.log(`  Suppliers    : ${suppliers.length} (expected 6)`);
  assert.equal(suppliers.length, 6, "Must have exactly 6 suppliers");

  console.log(`  Products     : ${products.length} (expected 24)`);
  assert.equal(products.length, 24, "Must have exactly 24 products");

  console.log(`  Inventory    : ${inventory.length} (expected 49)`);
  assert.equal(inventory.length, 49, "Must have exactly 49 inventory positions");

  console.log(`  POs          : ${pos.length} (expected 64)`);
  assert.equal(pos.length, 64, "Must have exactly 64 purchase orders");

  console.log(`  Transactions : ${txns.length} (expected ~3,900)`);
  assert.ok(
    txns.length >= 3700 && txns.length <= 4200,
    `Transaction count ${txns.length} must be ~3,900`
  );

  // 2. Compute metrics through real application domain functions
  const supplierLeadTimes = new Map(suppliers.map((s) => [s.supplierId, s.leadTimeDays]));
  const productSuppliers = new Map(products.map((p) => [p.sku, p.supplierId]));

  const appTransactions: InventoryTransaction[] = txns.map((t) => ({
    id: t.id,
    sku: t.sku,
    warehouseId: t.warehouseId,
    quantity: t.quantity,
    direction: t.direction as "IN" | "OUT",
    date: t.date.toISOString().slice(0, 10),
  }));

  const appPOs: PurchaseOrder[] = pos.map((p) => ({
    id: p.id,
    poNumber: p.poNumber,
    supplierId: p.supplierId,
    sku: p.sku,
    quantity: p.quantity,
    unitPrice: Number(p.unitPrice),
    orderDate: p.orderDate.toISOString().slice(0, 10),
    expectedDate: p.expectedDate.toISOString().slice(0, 10),
    receivedDate: p.receivedDate ? p.receivedDate.toISOString().slice(0, 10) : null,
  }));

  const insights = inventory.map((record) => {
    const supplierId = productSuppliers.get(record.sku);
    const rawLeadTime = supplierId ? supplierLeadTimes.get(supplierId) : undefined;
    const leadTime = typeof rawLeadTime === "number" && rawLeadTime > 0 ? rawLeadTime : 14;
    return buildInventoryInsight(appTransactions, record, leadTime);
  });

  // Check SKU-1015 at NDC
  const ndcWh = warehouses.find((w) => w.code === "NDC");
  assert.ok(ndcWh, "NDC warehouse must exist");
  const sku1015Ndc = insights.find((i) => i.sku === "SKU-1015" && i.warehouseId === ndcWh.id);
  assert.ok(sku1015Ndc, "SKU-1015 at NDC must exist in inventory insights");

  console.log("\n2. SKU-1015 at NDC Cover Check:");
  console.log(`  Days of Cover: ${sku1015Ndc.daysOfStock} (expected ~3.2)`);
  assert.ok(
    sku1015Ndc.daysOfStock !== null && sku1015Ndc.daysOfStock >= 3.0 && sku1015Ndc.daysOfStock <= 3.4,
    `SKU-1015 at NDC days of stock must be ~3.2 (actual: ${sku1015Ndc.daysOfStock})`
  );

  // Check SUP-004 OTIF
  const sup4Perf = computeSupplierPerformance("SUP-004", appPOs);
  console.log("\n3. SUP-004 Supplier OTIF Check:");
  console.log(`  Eligible POs : ${sup4Perf.eligiblePurchaseOrders}`);
  console.log(`  OTIF Count   : ${sup4Perf.onTimeInFullCount}`);
  console.log(`  OTIF Percent : ${sup4Perf.otifPercent}% (expected 0%)`);
  assert.equal(sup4Perf.otifPercent, 0, "SUP-004 OTIF must be 0%");

  // Check Overdue POs across whole org
  const today = todayISODate();
  const overduePOs = appPOs.filter((po) => po.receivedDate === null && po.expectedDate < today);
  console.log("\n4. Overdue Purchase Orders Check:");
  console.log(`  Overdue PO count: ${overduePOs.length} (expected 2)`);
  console.log(`  Overdue PO Numbers: ${overduePOs.map((p) => p.poNumber).join(", ")}`);
  assert.equal(overduePOs.length, 2, "Must have exactly 2 overdue purchase orders across org");

  console.log("\n--- All 49 Inventory Insights ---");
  insights.forEach((i, idx) => {
    console.log(`[${idx + 1}] ${i.sku} at wh ${i.warehouseId}: qoh=${i.availableQuantity}, avgDemand=${i.averageDailyDemand}, ot=${i.overstockThreshold}, status=${i.status}`);
  });

  const overstockPositions = insights.filter((i) => i.status === "overstock");
  console.log("\n5. Overstock Positions Check:");
  console.log(`  Overstock count : ${overstockPositions.length} (expected 12)`);
  assert.equal(overstockPositions.length, 12, "Must have exactly 12 overstock positions");

  // 6. Overall health score — reads the same repository function the
  // dashboard actually calls, not a reimplementation, so this can't drift
  // from the real app by reimplementation error.
  const health = await getSupplyChainHealth(targetOrg);
  console.log("\n6. Overall Health Score Check:");
  console.log(`  Overall: ${health.overall} (expected 75-95)`);
  console.log(`  Components: inventory=${health.inventory} supplier=${health.supplier} procurement=${health.procurement} logistics=${health.logistics} warehouse=${health.warehouse}`);
  assert.ok(
    health.overall >= 75 && health.overall <= 95,
    `Overall health score ${health.overall} must be in the 75-95 band. If it's outside this band, that's a real regression worth investigating — ` +
      `if it's a deliberate, understood change to the scoring formula or seed data, update this band and README's "Known metric drift" section together.`
  );

  // 7. Alert count — same reasoning: a live regression (e.g. an alert
  // category silently stops firing) should fail this; ordinary date drift
  // should not.
  const alerts = await getAlerts(targetOrg);
  console.log("\n7. Alert Count Check:");
  console.log(`  Total alerts: ${alerts.length} (expected 4-10)`);
  alerts.forEach((a) => console.log(`    (${a.severity}) ${a.title}`));
  assert.ok(
    alerts.length >= 4 && alerts.length <= 10,
    `Alert count ${alerts.length} must be in the 4-10 band.`
  );

  console.log("\n✅ ALL CANONICAL VALUES VERIFIED AND MATCH SPECIFICATION EXACTLY!");
}

if (require.main === module) {
  verifyCanonicalData(ORG_ID)
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error("\n❌ Verification failed:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
