import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { selectTopAlerts } from "../alert-selection";
import { getAlerts } from "../alerts";
import { buildHealthScoreAlerts } from "../health-alerts";
import { addDays, todayISODate } from "@/lib/dates";
import type { AlertGroup, InventoryInsight, InventoryTransaction, SupplyChainAlert } from "@/types/supply-chain";

function make(group: AlertGroup | undefined, n: number, prefix: string): SupplyChainAlert[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    category: "inventory" as const,
    group,
    severity: "warning" as const,
    title: `${prefix} ${i + 1}`,
    description: "",
    createdAt: "2026-09-26T00:00:00.000Z",
  }));
}

/** The real distribution on Preview today, in rank order (106 alerts). */
function previewToday(): SupplyChainAlert[] {
  return [
    ...make("health", 1, "HEALTH"),
    ...make("stockout", 25, "STOCKOUT"),
    ...make("overdue_po", 56, "PO"),
    ...make("low_stock", 21, "LOW"),
    ...make("overstock", 1, "OVERSTOCK"),
    ...make("supplier", 2, "SUP"),
  ];
}

describe("Overview top 10: every alert type gets a slot", () => {
  test("Preview today: 1 health + 5 stockouts + 1 overdue PO + 1 low stock + overstock + supplier", () => {
    const ids = selectTopAlerts(previewToday(), 10).map((a) => a.id);
    assert.deepEqual(ids, [
      "HEALTH-1",
      "STOCKOUT-1", "STOCKOUT-2", "STOCKOUT-3", "STOCKOUT-4", "STOCKOUT-5",
      "PO-1",
      "LOW-1",
      "OVERSTOCK-1",
      "SUP-1",
    ]);
  });

  test("a demand spike at rank ~104 makes the top 10 (it was never visible before)", () => {
    const all = previewToday();
    const withSpike = [...all.slice(0, 103), ...make("demand_spike", 1, "SPIKE"), ...all.slice(103)];
    assert.equal(withSpike.findIndex((a) => a.id === "SPIKE-1"), 103, "precondition: spike ranks 104th");
    const top = selectTopAlerts(withSpike, 10).map((a) => a.id);
    assert.equal(top.length, 10);
    assert.ok(top.includes("SPIKE-1"));
    // One stockout gives up its slot; the most urgent stockouts stay.
    assert.deepEqual(top.filter((id) => id.startsWith("STOCKOUT")), ["STOCKOUT-1", "STOCKOUT-2", "STOCKOUT-3", "STOCKOUT-4"]);
  });

  test("the result keeps rank order (critical first), not group order", () => {
    const top = selectTopAlerts(previewToday(), 10);
    const all = previewToday().map((a) => a.id);
    const positions = top.map((a) => all.indexOf(a.id));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  });

  test("10 or fewer alerts are all shown unchanged", () => {
    const few = [...make("stockout", 7, "STOCKOUT"), ...make("supplier", 3, "SUP")];
    assert.deepEqual(selectTopAlerts(few, 10), few);
  });

  test("only one type present -> plain top 10 by rank", () => {
    assert.deepEqual(selectTopAlerts(make("stockout", 30, "STOCKOUT"), 10).map((a) => a.id), make("stockout", 10, "STOCKOUT").map((a) => a.id));
  });

  test("never exceeds the limit, even with more groups than slots", () => {
    const groups: AlertGroup[] = ["health", "stockout", "overdue_po", "low_stock", "demand_spike", "overstock", "supplier"];
    const many = groups.flatMap((g) => make(g, 3, g));
    const top = selectTopAlerts(many, 5);
    assert.equal(top.length, 5);
    assert.deepEqual(top.map((a) => a.group), ["health", "stockout", "overdue_po", "low_stock", "demand_spike"]);
  });

  test("alerts without a group get no reserved slot but still fill by rank", () => {
    const list = [...make("stockout", 12, "STOCKOUT"), ...make(undefined, 1, "UNGROUPED")];
    assert.ok(!selectTopAlerts(list, 10).some((a) => a.id === "UNGROUPED-1"));
  });
});

describe("every alert is tagged with its group", () => {
  test("getAlerts: stockout, overdue PO, low stock, demand spike, overstock", async () => {
    const today = todayISODate();
    const txs: InventoryTransaction[] = [];
    let id = 1;
    for (let d = 7; d <= 96; d++) txs.push({ id: id++, sku: "SKU-SPIKE", warehouseId: 1, quantity: [8, 9, 10, 11, 12][d % 5], direction: "OUT", date: addDays(today, -d) });
    for (let d = 0; d <= 6; d++) txs.push({ id: id++, sku: "SKU-SPIKE", warehouseId: 1, quantity: 40, direction: "OUT", date: addDays(today, -d) });

    const insight = (sku: string, over: Partial<InventoryInsight>): InventoryInsight => ({
      sku, warehouseId: 1, availableQuantity: 1000, averageDailyDemand: 10, daysOfStock: 100,
      safetyStock: 50, reorderPoint: 200, overstockThreshold: 5000, status: "healthy", ...over,
    });
    const alerts = await getAlerts("test-org", {
      insights: [
        insight("SKU-OUT", { availableQuantity: 0, daysOfStock: 0, status: "stock_out_risk" }),
        insight("SKU-LOW", { availableQuantity: 150, daysOfStock: 15, status: "low_stock" }),
        insight("SKU-OVER", { availableQuantity: 9000, daysOfStock: 900, status: "overstock" }),
        insight("SKU-SPIKE", {}),
      ],
      supplierPerf: [],
      openPOs: [{ id: 1, poNumber: "PO-1", supplierId: "SUP-001", sku: "SKU-OUT", quantity: 10, unitPrice: 1, orderDate: addDays(today, -30), expectedDate: addDays(today, -5), receivedDate: null }],
      products: [],
      suppliers: [],
      warehouses: [],
      transactions: txs,
    });
    const groups = Object.fromEntries(alerts.map((a) => [a.id, a.group]));
    assert.equal(groups["ALT-INV-STOCKOUT-SKU-OUT-1"], "stockout");
    assert.equal(groups["ALT-PO-PO-1"], "overdue_po");
    assert.equal(groups["ALT-INV-LOW-SKU-LOW-1"], "low_stock");
    assert.equal(groups["ALT-INV-SPIKE-SKU-SPIKE-1"], "demand_spike");
    assert.equal(groups["ALT-INV-OVERSTOCK-AGGREGATE"], "overstock");
    assert.ok(alerts.every((a) => a.group), "no untagged alerts");
  });

  test("health-score alerts are tagged health", () => {
    const alerts = buildHealthScoreAlerts({
      inventory: { score: 0, unhealthyCount: 1, totalCount: 1 },
      supplier: { score: 0 },
      procurement: { score: 0, fulfillment: 0, cycleTime: 0, priceStability: 0 },
      logistics: { score: 0, onTimeRate: null },
      warehouse: { score: null, worst: null },
    });
    assert.ok(alerts.length >= 4);
    assert.ok(alerts.every((a) => a.group === "health"));
  });
});
