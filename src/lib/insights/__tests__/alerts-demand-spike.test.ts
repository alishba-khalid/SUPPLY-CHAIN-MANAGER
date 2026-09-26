import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getAlerts } from "@/lib/insights/alerts";
import { addDays, todayISODate } from "@/lib/dates";
import type { InventoryInsight, InventoryTransaction, Product, Supplier, Warehouse } from "@/types/supply-chain";

const TODAY = todayISODate();
let nextId = 1;

/** Usual rate exactly 10/day over the baseline (days 7..96 ago), then `week` for the last 7 days. */
function history(sku: string, week: number[]): InventoryTransaction[] {
  const pattern = [8, 9, 10, 11, 12];
  const txs: InventoryTransaction[] = [];
  const out = (daysAgo: number, quantity: number) =>
    txs.push({ id: nextId++, sku, warehouseId: 1, quantity, direction: "OUT", date: addDays(TODAY, -daysAgo) });
  for (let d = 7; d <= 96; d++) out(d, pattern[d % 5]);
  week.forEach((qty, daysAgo) => qty > 0 && out(daysAgo, qty));
  return txs;
}

function insight(sku: string, over: Partial<InventoryInsight> = {}): InventoryInsight {
  return {
    sku,
    warehouseId: 1,
    availableQuantity: 1000,
    averageDailyDemand: 10,
    daysOfStock: 100,
    safetyStock: 50,
    reorderPoint: 200,
    overstockThreshold: 5000,
    status: "healthy",
    ...over,
  };
}

const SKUS = ["SKU-SPIKE", "SKU-BULK", "SKU-OUT", "SKU-LOW", "SKU-NORMAL"];
const products: Product[] = SKUS.map((sku, i) => ({ id: i + 1, sku, name: sku, category: "parts", unitCost: 2, supplierId: "SUP-001" }));
const supplier: Supplier = { id: 1, supplierId: "SUP-001", name: "Supplier", leadTimeDays: 14, leadTimeMissing: false, email: "a@b.c" };
const warehouse: Warehouse = { id: 1, code: "NDC", name: "NDC", capacityUnits: 10000 };

async function run() {
  return getAlerts("test-org", {
    insights: [
      insight("SKU-SPIKE"),
      insight("SKU-BULK"),
      insight("SKU-OUT", { availableQuantity: 0, daysOfStock: 0, status: "stock_out_risk" }),
      insight("SKU-LOW", { availableQuantity: 150, daysOfStock: 15, status: "low_stock" }),
      insight("SKU-NORMAL"),
    ],
    supplierPerf: [],
    openPOs: [],
    products,
    suppliers: [supplier],
    warehouses: [warehouse],
    transactions: [
      ...history("SKU-SPIKE", [40, 40, 40, 40, 40, 40, 40]),
      ...history("SKU-BULK", [10, 10, 310, 10, 10, 10, 10]),
      ...history("SKU-OUT", [40, 40, 40, 40, 40, 40, 40]),
      ...history("SKU-LOW", [10, 10, 10, 10, 10, 10, 10]),
      ...history("SKU-NORMAL", [7, 13, 8, 12, 10, 13, 7]),
    ],
  });
}

describe("getAlerts: demand spike alerts", () => {
  test("sustained spike on a healthy position gets its own alert", async () => {
    const alert = (await run()).find((a) => a.id === "ALT-INV-SPIKE-SKU-SPIKE-1");
    assert.ok(alert);
    assert.equal(alert.severity, "warning");
    assert.equal(alert.title, "SKU-SPIKE at NDC — demand spike: 4× usual rate");
    assert.match(alert.description, /280 units sold in the last 7 days vs 70 usual \(10\/day over the prior 90 days\)/);
    assert.match(alert.description, /1,000 on hand covers 25 days \(100 at the usual rate\)/);
  });

  test("one-off large order gets its own, separately labelled alert", async () => {
    const alerts = await run();
    const alert = alerts.find((a) => a.id === "ALT-INV-LARGE-ORDER-SKU-BULK-1");
    assert.ok(alert);
    assert.match(alert.title, /single large order: 310 units on /);
    assert.equal(alerts.find((a) => a.id === "ALT-INV-SPIKE-SKU-BULK-1"), undefined, "must not also be called a sustained spike");
  });

  test("a spiking position that is already a stockout gets one alert, with the spike as a note", async () => {
    const alerts = await run();
    const forSku = alerts.filter((a) => a.sku === "SKU-OUT");
    assert.equal(forSku.length, 1);
    assert.ok(forSku[0].id.startsWith("ALT-INV-STOCKOUT"));
    assert.match(forSku[0].description, /Demand spike: 280 units sold in the last 7 days vs 70 usual \(4×\)/);
  });

  test("normal variance and steady low-stock positions raise no spike", async () => {
    const alerts = await run();
    assert.equal(alerts.filter((a) => a.sku === "SKU-NORMAL").length, 0);
    const low = alerts.filter((a) => a.sku === "SKU-LOW");
    assert.equal(low.length, 1);
    assert.ok(low[0].id.startsWith("ALT-INV-LOW"));
    assert.doesNotMatch(low[0].description, /spike|large order/i);
  });

  test("ranking: stockout, then low stock, then spike alerts", async () => {
    const ids = (await run()).map((a) => a.id);
    const at = (prefix: string) => ids.findIndex((id) => id.startsWith(prefix));
    assert.ok(at("ALT-INV-STOCKOUT") < at("ALT-INV-LOW"));
    assert.ok(at("ALT-INV-LOW") < at("ALT-INV-SPIKE"));
    assert.ok(at("ALT-INV-LOW") < at("ALT-INV-LARGE-ORDER"));
  });
});
