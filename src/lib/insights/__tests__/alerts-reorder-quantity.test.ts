import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getAlerts } from "../alerts";
import { generateSuggestedPurchaseOrders } from "@/lib/forecasting/demand-forecast";
import { addDays, todayISODate } from "@/lib/dates";
import type { InventoryInsight, InventoryTransaction, Product, PurchaseOrder, Supplier, Warehouse } from "@/types/supply-chain";

const TODAY = todayISODate();
const supplier: Supplier = { id: 1, supplierId: "SUP-001", name: "Supplier", leadTimeDays: 14, leadTimeMissing: false, email: "a@b.c" };
const warehouse: Warehouse = { id: 1, code: "NDC", name: "NDC", capacityUnits: 100000 };
const skus = ["SKU-A", "SKU-B", "SKU-C"];
const products: Product[] = skus.map((sku, i) => ({ id: i + 1, sku, name: sku, category: "parts", unitCost: 4, supplierId: "SUP-001" }));

let id = 1;
/** 90 days of noisy daily sales around `rate`. */
function sales(sku: string, rate: number): InventoryTransaction[] {
  return Array.from({ length: 90 }, (_, d) => ({
    id: id++, sku, warehouseId: 1, direction: "OUT" as const, date: addDays(TODAY, -(d + 1)),
    quantity: Math.max(0, Math.round(rate + ((d * 7) % 5) - 2)),
  }));
}
function insight(sku: string, onHand: number, rate: number): InventoryInsight {
  return {
    sku, warehouseId: 1, availableQuantity: onHand, averageDailyDemand: rate, daysOfStock: onHand / rate,
    safetyStock: 0, reorderPoint: rate * 20, overstockThreshold: rate * 200, status: onHand / rate <= 3 ? "stock_out_risk" : "low_stock",
  };
}

const insights = [insight("SKU-A", 5, 20), insight("SKU-B", 100, 30), insight("SKU-C", 60, 12)];
const transactions = [...sales("SKU-A", 20), ...sales("SKU-B", 30), ...sales("SKU-C", 12)];
const purchaseOrders: PurchaseOrder[] = [
  // Credited inbound for SKU-B, arriving inside the planning window.
  { id: 1, poNumber: "PO-1", supplierId: "SUP-001", sku: "SKU-B", quantity: 150, unitPrice: 4, orderDate: addDays(TODAY, -5), expectedDate: addDays(TODAY, 6), receivedDate: null },
  // Overdue PO for SKU-C: never credited, by either path.
  { id: 2, poNumber: "PO-2", supplierId: "SUP-001", sku: "SKU-C", quantity: 400, unitPrice: 4, orderDate: addDays(TODAY, -30), expectedDate: addDays(TODAY, -3), receivedDate: null },
];

describe("one reorder quantity everywhere", () => {
  test("Overview alert quantity = Inventory panel quantity for every position (incl. inbound and overdue POs)", async () => {
    const panel = generateSuggestedPurchaseOrders({
      insights,
      records: insights.map((i, idx) => ({ id: idx, sku: i.sku, warehouseId: i.warehouseId, quantityOnHand: i.availableQuantity })),
      products, suppliers: [supplier], warehouses: [warehouse], purchaseOrders, transactions,
    });
    const alerts = await getAlerts("test-org", {
      insights, supplierPerf: [], openPOs: purchaseOrders, products, suppliers: [supplier], warehouses: [warehouse], transactions,
    });

    for (const sku of skus) {
      const p = panel.find((s) => s.sku === sku);
      const a = alerts.find((x) => x.sku === sku && x.suggestedQuantity !== undefined);
      assert.ok(p, `panel suggestion for ${sku}`);
      assert.ok(a, `alert with a quantity for ${sku}`);
      assert.equal(a.suggestedQuantity, p.suggestedQuantity, `${sku}: alert ${a.suggestedQuantity} vs panel ${p.suggestedQuantity}`);
      assert.equal(a.estimatedCost, p.estimatedCost, `${sku}: same estimated cost`);
    }
  });

  test("no rounding on top of the engine's number (the old alert formula rounded up to 10s/50s)", async () => {
    const alerts = await getAlerts("test-org", {
      insights, supplierPerf: [], openPOs: purchaseOrders, products, suppliers: [supplier], warehouses: [warehouse], transactions,
    });
    const quantities = alerts.map((a) => a.suggestedQuantity).filter((q): q is number => typeof q === "number" && q > 0);
    assert.ok(quantities.length > 0);
    assert.ok(quantities.some((q) => q % 10 !== 0), `expected at least one unrounded quantity, got ${quantities.join(", ")}`);
  });
});
