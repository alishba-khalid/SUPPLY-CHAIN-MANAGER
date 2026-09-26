import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { detectDemandSpike, SPIKE_MIN_EXCESS_UNITS, SPIKE_RATIO } from "../demand-spike";
import { addDays, todayISODate } from "../../dates";
import type { InventoryTransaction } from "@/types/supply-chain";

const TODAY = todayISODate();
const SKU = "SKU-SPIKE";
const WH = 1;

let nextId = 1;
function out(daysAgo: number, quantity: number): InventoryTransaction {
  return { id: nextId++, sku: SKU, warehouseId: WH, quantity, direction: "OUT", date: addDays(TODAY, -daysAgo) };
}
function received(daysAgo: number, quantity: number): InventoryTransaction {
  return { id: nextId++, sku: SKU, warehouseId: WH, quantity, direction: "IN", date: addDays(TODAY, -daysAgo) };
}

/** Baseline window is days 7..96 ago. 8,9,10,11,12 repeating: usual rate exactly 10/day. */
function steadyBaseline(): InventoryTransaction[] {
  const pattern = [8, 9, 10, 11, 12];
  const txs: InventoryTransaction[] = [];
  for (let d = 7; d <= 96; d++) txs.push(out(d, pattern[d % 5]));
  return txs;
}
/** Sales for the recent window (0..6 days ago), one entry per day. */
function recentWeek(daily: number[]): InventoryTransaction[] {
  return daily.map((qty, i) => out(i, qty)).filter((t) => t.quantity > 0);
}

describe("demand spike: answer key", () => {
  test("REAL SPIKE: steady 10/day, then 40/day for a week -> sustained spike", () => {
    const spike = detectDemandSpike([...steadyBaseline(), ...recentWeek([40, 40, 40, 40, 40, 40, 40])], SKU, WH, TODAY);
    assert.ok(spike, "a 4x week on a steady SKU must be flagged");
    assert.equal(spike.kind, "sustained");
    assert.equal(spike.recentUnits, 280);
    assert.equal(spike.baselineDailyDemand, 10, "baseline must exclude the spike week itself");
    assert.equal(spike.expectedUnits, 70);
    assert.equal(spike.ratio, 4);
    assert.equal(spike.excessUnits, 210);
  });

  test("NORMAL VARIANCE: steady 10/day with +/-30% day-to-day noise -> no alert", () => {
    const spike = detectDemandSpike([...steadyBaseline(), ...recentWeek([7, 13, 8, 12, 10, 13, 7])], SKU, WH, TODAY);
    assert.equal(spike, null);
  });

  test("NORMAL VARIANCE: a busy week at 2x the usual rate -> no alert (below 3x)", () => {
    const spike = detectDemandSpike([...steadyBaseline(), ...recentWeek([20, 20, 20, 20, 20, 20, 20])], SKU, WH, TODAY);
    assert.equal(spike, null);
  });

  test("LOW-VOLUME NOISE: 1 unit/week, then 4 units in a week -> no alert (excess below the unit floor)", () => {
    const txs = [received(100, 50)];
    for (let d = 7; d <= 91; d += 7) txs.push(out(d, 1)); // 13 selling days in the baseline
    txs.push(out(1, 2), out(3, 2));
    // The ratio test alone would pass (4 units vs ~1 expected); the unit floor is what stops it.
    const expected = (13 / 90) * 7;
    assert.ok(4 / expected >= SPIKE_RATIO, "precondition: ratio test passes on its own");
    assert.ok(4 - expected < SPIKE_MIN_EXCESS_UNITS, "precondition: excess is under the floor");
    assert.equal(detectDemandSpike(txs, SKU, WH, TODAY), null);
  });

  test("INTERMITTENT DEMAND: 15-unit lumps every week or so, three lumps this week -> no alert (sigma test)", () => {
    const txs = [received(100, 500)];
    for (let d = 10; d <= 87; d += 7) txs.push(out(d, 15)); // 12 lumpy selling days, usual rate 2/day
    txs.push(out(1, 15), out(3, 15), out(5, 15)); // 45 units vs 14 expected: 3.2x and 31 units over
    // Ratio and floor both pass; only the 3-sigma test (needs ~55 units for this erratic SKU) stops it.
    assert.equal(detectDemandSpike(txs, SKU, WH, TODAY), null);
  });

  test("NO USUAL RATE: fewer than 10 selling days in the baseline -> no alert", () => {
    const txs = [received(100, 500), out(20, 5), out(35, 5), out(50, 5), out(65, 5), out(80, 5)];
    txs.push(...recentWeek([0, 40, 0, 30, 0, 30, 0]));
    assert.equal(detectDemandSpike(txs, SKU, WH, TODAY), null);
  });

  test("SHORT HISTORY: SKU first seen 10 days ago -> no alert (days before the data would read as zero sales)", () => {
    const txs: InventoryTransaction[] = [];
    for (let d = 7; d <= 10; d++) txs.push(out(d, 10));
    txs.push(...recentWeek([40, 40, 40, 40, 40, 40, 40]));
    assert.equal(detectDemandSpike(txs, SKU, WH, TODAY), null);
  });

  test("NO RECENT SALES -> no alert", () => {
    assert.equal(detectDemandSpike(steadyBaseline(), SKU, WH, TODAY), null);
  });

  test("SINGLE LARGE ORDER: normal week plus one 300-unit order -> flagged separately as single_order", () => {
    const week = recentWeek([10, 10, 310, 10, 10, 10, 10]);
    const spike = detectDemandSpike([...steadyBaseline(), ...week], SKU, WH, TODAY);
    assert.ok(spike, "a one-off large order must still be surfaced");
    assert.equal(spike.kind, "single_order");
    assert.equal(spike.recentUnits, 370);
    assert.deepEqual(spike.largestDay, { date: addDays(TODAY, -2), units: 310 });
  });

  test("other SKUs and warehouses are ignored", () => {
    const other = recentWeek([400, 400, 400, 400, 400, 400, 400]).map((t) => ({ ...t, sku: "SKU-OTHER" }));
    const otherWh = recentWeek([400, 400, 400, 400, 400, 400, 400]).map((t) => ({ ...t, warehouseId: 2 }));
    const spike = detectDemandSpike([...steadyBaseline(), ...recentWeek([10, 10, 10, 10, 10, 10, 10]), ...other, ...otherWh], SKU, WH, TODAY);
    assert.equal(spike, null);
  });
});
