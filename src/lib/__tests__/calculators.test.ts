import { test } from "node:test";
import assert from "node:assert/strict";
import { economicOrderQuantity, reorderPoint, simpleSafetyStock, statisticalSafetyStock } from "../calculators";

test("reorder point adds lead time demand and safety stock", () => {
  assert.equal(reorderPoint(21, 8, 84), 252);
});

test("statistical safety stock matches the worked example (sigma 40)", () => {
  assert.equal(Math.round(statisticalSafetyStock(0.9, 40, 1)!), 51);
  assert.equal(Math.round(statisticalSafetyStock(0.95, 40, 1)!), 66);
  assert.equal(Math.round(statisticalSafetyStock(0.99, 40, 1)!), 93);
  assert.equal(statisticalSafetyStock(0.5, 40, 1), null);
  assert.equal(statisticalSafetyStock(0.95, 40, 0), null);
});

test("statistical safety stock scales with the square root of lead time", () => {
  const one = statisticalSafetyStock(0.95, 10, 1)!;
  const four = statisticalSafetyStock(0.95, 10, 4)!;
  assert.ok(Math.abs(four - one * 2) < 1e-9);
});

test("simple safety stock never goes negative", () => {
  assert.equal(simpleSafetyStock(30, 12, 20, 10), 160);
  assert.equal(simpleSafetyStock(10, 5, 20, 10), 0);
});

test("EOQ matches the worked example", () => {
  const r = economicOrderQuantity(5000, 50, 2.5)!;
  assert.equal(Math.round(r.eoq), 447);
  assert.equal(Math.round(r.ordersPerYear), 11);
  assert.ok(Math.abs(r.annualOrderingCost - r.annualHoldingCost) < 1e-6, "ordering and holding cost are equal at the EOQ");
  assert.equal(economicOrderQuantity(0, 50, 2.5), null);
  assert.equal(economicOrderQuantity(5000, 50, 0), null);
});
