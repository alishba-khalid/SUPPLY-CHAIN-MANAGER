import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { trimmedDailyDemand, buildInventoryInsight } from "../inventory";
import { todayISODate, addDays } from "../../dates";
import type { InventoryTransaction } from "@/types/supply-chain";

describe("Intermittent Demand & Trimmed Velocity Edge Cases", () => {
  const today = todayISODate();

  test("Edge Case 1: SKU with exactly 0 sales in 90 days returns null (no fake nonzero value)", () => {
    const transactions: InventoryTransaction[] = [];
    const demand = trimmedDailyDemand(transactions, "SKU-ZERO", 1, 90, 0.05);
    assert.strictEqual(demand, null, "Zero sales must return null");

    const insight = buildInventoryInsight(
      transactions,
      { sku: "SKU-ZERO", warehouseId: 1, quantityOnHand: 50 },
      14,
      90
    );
    assert.strictEqual(insight.averageDailyDemand, null, "Insight demand must be null");
    assert.strictEqual(insight.daysOfStock, null, "Days of stock must be null");
    assert.strictEqual(insight.status, "dead_stock", "0 sales should classify as dead_stock or similar");
  });

  test("Edge Case 2: SKU at boundary (exactly 4 active sale-days in 90d) falls back to non-trimmed average", () => {
    // 4 sale days with 5 units each = 20 units total.
    // 20 / 90 = 0.22 units/day.
    const transactions: InventoryTransaction[] = [
      { id: 1, sku: "SKU-BOUND-4", warehouseId: 1, quantity: 5, direction: "OUT", date: addDays(today, -10) },
      { id: 2, sku: "SKU-BOUND-4", warehouseId: 1, quantity: 5, direction: "OUT", date: addDays(today, -25) },
      { id: 3, sku: "SKU-BOUND-4", warehouseId: 1, quantity: 5, direction: "OUT", date: addDays(today, -40) },
      { id: 4, sku: "SKU-BOUND-4", warehouseId: 1, quantity: 5, direction: "OUT", date: addDays(today, -60) },
    ];

    const demand = trimmedDailyDemand(transactions, "SKU-BOUND-4", 1, 90, 0.05);
    assert.ok(demand !== null && demand > 0, `Demand must be positive, got ${demand}`);
    assert.strictEqual(demand, 0.22, "Expected 20 / 90 = 0.22 units/day");

    const insight = buildInventoryInsight(
      transactions,
      { sku: "SKU-BOUND-4", warehouseId: 1, quantityOnHand: 1 },
      14,
      90
    );
    assert.strictEqual(insight.averageDailyDemand, 0.22);
    // 1 on hand / 0.22 = 4.5 days of stock
    assert.strictEqual(insight.daysOfStock, 4.5);
    // 1 on hand < safetyStock (1.5) -> low_stock
    assert.strictEqual(insight.status, "low_stock");
  });

  test("Edge Case 3: SKU with fewer than 4 sales days (1, 2, 3 days) also computes positive demand", () => {
    const txns1: InventoryTransaction[] = [
      { id: 1, sku: "SKU-SLOW-1", warehouseId: 1, quantity: 18, direction: "OUT", date: addDays(today, -15) },
    ];
    const demand1 = trimmedDailyDemand(txns1, "SKU-SLOW-1", 1, 90, 0.05);
    assert.strictEqual(demand1, 0.2, "18 / 90 = 0.2 units/day");

    const txns2: InventoryTransaction[] = [
      { id: 1, sku: "SKU-SLOW-2", warehouseId: 1, quantity: 9, direction: "OUT", date: addDays(today, -15) },
      { id: 2, sku: "SKU-SLOW-2", warehouseId: 1, quantity: 9, direction: "OUT", date: addDays(today, -30) },
    ];
    const demand2 = trimmedDailyDemand(txns2, "SKU-SLOW-2", 1, 90, 0.05);
    assert.strictEqual(demand2, 0.2, "18 / 90 = 0.2 units/day");
  });

  test("Edge Case 4: Genuine fast mover (many sales days) retains trimmed-mean outlier resistance unchanged", () => {
    // 90 days of sales: 88 days of 10 units/day, and 2 outlier days of 100 units/day
    const transactions: InventoryTransaction[] = [];
    for (let i = 0; i < 90; i++) {
      const qty = (i === 10 || i === 20) ? 100 : 10;
      transactions.push({
        id: i + 1,
        sku: "SKU-FAST",
        warehouseId: 1,
        quantity: qty,
        direction: "OUT",
        date: addDays(today, -i),
      });
    }

    const demand = trimmedDailyDemand(transactions, "SKU-FAST", 1, 90, 0.05);
    // With 90 days, 4 highest (including the two 100s) and 4 lowest (10s) are trimmed.
    // The remaining 82 days all have 10 units. Trimmed mean = 10.00.
    assert.strictEqual(demand, 10, "Fast mover should still trim spikes to 10.00");
  });

  test("Edge Case 5: Moderate intermittent SKU (5-15 active days) does not drop real sales", () => {
    // 8 sales days of 6 units each = 48 units total.
    // 48 / 90 = 0.53 units/day.
    const transactions: InventoryTransaction[] = [];
    for (let i = 1; i <= 8; i++) {
      transactions.push({
        id: i,
        sku: "SKU-MOD",
        warehouseId: 1,
        quantity: 6,
        direction: "OUT",
        date: addDays(today, -i * 10),
      });
    }

    const demand = trimmedDailyDemand(transactions, "SKU-MOD", 1, 90, 0.05);
    assert.strictEqual(demand, 0.53, "8 sales days (48 total) should evaluate to 0.53 units/day without trimming non-outlier days");
  });
});
