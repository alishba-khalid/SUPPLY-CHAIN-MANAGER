import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getAlerts } from "@/lib/insights/alerts";
import type { InventoryInsight, Product, Supplier, Warehouse } from "@/types/supply-chain";

const product: Product = { id: 1, sku: "SKU-NODEMAND", name: "No-demand part", category: "seals", unitCost: 2, supplierId: "SUP-001" };
const supplier: Supplier = { id: 1, supplierId: "SUP-001", name: "Supplier", leadTimeDays: 14, leadTimeMissing: false, email: "a@b.c" };
const warehouse: Warehouse = { id: 1, code: "NDC", name: "NDC", capacityUnits: 10000 };

function outOfStock(averageDailyDemand: number | null): InventoryInsight {
  return {
    sku: "SKU-NODEMAND",
    warehouseId: 1,
    availableQuantity: 0,
    averageDailyDemand,
    daysOfStock: null,
    safetyStock: 0,
    reorderPoint: 0,
    overstockThreshold: 0,
    status: "stock_out_risk",
  };
}

async function stockoutAlertFor(insight: InventoryInsight) {
  const alerts = await getAlerts("test-org", {
    insights: [insight],
    supplierPerf: [],
    openPOs: [],
    products: [product],
    suppliers: [supplier],
    warehouses: [warehouse],
    transactions: [],
  });
  const alert = alerts.find((a) => a.id.startsWith("ALT-INV-STOCKOUT"));
  assert.ok(alert, "an out-of-stock position must still raise a stockout alert");
  return alert;
}

describe("alerts never invent a demand rate", () => {
  for (const [label, demand] of [["null", null], ["0", 0]] as const) {
    test(`demand ${label}: no reorder quantity or cost is sized from a made-up rate`, async () => {
      const alert = await stockoutAlertFor(outOfStock(demand));
      // The old `|| 5` fallback produced 5/day x (14 + 7) days = 105 -> rounded to 110 units.
      assert.equal(alert.suggestedQuantity, undefined);
      assert.equal(alert.estimatedCost, undefined);
      assert.match(alert.teaser ?? "", /no demand rate to size a reorder/);
    });
  }

  test("known demand still gets a reorder suggestion", async () => {
    const alert = await stockoutAlertFor({ ...outOfStock(10), daysOfStock: 0 });
    // Forecast engine: (14-day lead time + 1 review day) x 10/day + 70 safety stock = 220, minus 0 on hand / 0 inbound.
    assert.equal(alert.suggestedQuantity, 220);
    assert.equal(alert.estimatedCost, 440);
  });
});
