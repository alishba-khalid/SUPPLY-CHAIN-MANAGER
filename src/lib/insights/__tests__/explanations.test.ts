import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { explainDaysOfStock, explainReorderQuantity, explainSupplierScore, formatDaysOfStock } from "../explanations";

// Inputs are the real Production values the approved wording was written from.

describe("days until stockout explanation (approved wording)", () => {
  test("SKU-1150 @ NDC: full history, trimmed rate", () => {
    const e = explainDaysOfStock({ onHand: 546, dailyDemand: 26.34, daysOfStock: 20.729, historyDays: 90, activeDays: 87, totalSold: 2370 });
    assert.equal(e.headline, "20.7 days until stockout");
    assert.deepEqual(e.lines, [
      "546 on hand ÷ 26.34 sold per day",
      "Daily rate: the last 90 days of sales, leaving out the busiest and quietest 5% of selling days so one-off spikes don't skew it.",
      "Stock on order isn't counted here — see Projections for arrivals.",
    ]);
    assert.equal(e.warning, undefined);
  });

  test("SKU-1062 @ WH-WEST: new product, 1 sale — says it's an early estimate", () => {
    const e = explainDaysOfStock({ onHand: 10, dailyDemand: 0.55, daysOfStock: 18.18, historyDays: 11, activeDays: 1, totalSold: 6 });
    assert.equal(e.headline, "18.2 days until stockout");
    assert.deepEqual(e.lines, ["10 on hand ÷ 0.55 sold per day"]);
    assert.equal(e.warning, "Early estimate: based on only 11 days of history and 1 day with sales (6 units ÷ 11 days). This will change as more sales come in.");
  });

  test("no sales / out of stock", () => {
    assert.deepEqual(explainDaysOfStock({ onHand: 40, dailyDemand: null, daysOfStock: null, historyDays: 90, activeDays: 0, totalSold: 0 }).lines, [
      "No sales in the last 90 days, so there's nothing to count down — this stock isn't being used.",
    ]);
    assert.deepEqual(explainDaysOfStock({ onHand: 0, dailyDemand: 5, daysOfStock: 0, historyDays: 90, activeDays: 30, totalSold: 450 }).lines, ["Out of stock — 0 on hand."]);
  });

  test("one decimal everywhere (fixes 17.5 in the table vs 18 in the alert)", () => {
    assert.equal(formatDaysOfStock(17.46), "17.5 days");
    assert.equal(formatDaysOfStock(1), "1 day");
  });
});

describe("reorder quantity explanation (approved wording)", () => {
  test("SKU-1150 @ NDC -> 780, overdue POs listed as not counted, and the lines add up", () => {
    const e = explainReorderQuantity({
      quantity: 780, dailyDemand: 26.34, leadTimeDays: 42, leadTimeMissing: false, supplierName: "Harbor Freight Supply", reviewDays: 1,
      sigma: 18.05, safetyStock: 193.0, targetStock: 1326, onHand: 546, inbound: [],
      overdue: [{ poNumber: "PO-20207", quantity: 816 }, { poNumber: "PO-20217", quantity: 1479 }], historyDays: 90, activeDays: 87,
    });
    assert.equal(e.headline, "How we got 780 units");
    assert.deepEqual(e.lines, [
      "Target stock to hold: 1,326",
      "· Lead-time demand: 26.34/day × 43 days (42-day supplier lead time + 1 day to the next review) = 1,133",
      "· Safety buffer: 193 — covers day-to-day swings of ±18.05/day over the 42-day lead time (95% service level)",
      "− On hand: 546",
      "− On order, arriving in time: 0 (PO-20207 · 816 units and PO-20217 · 1,479 units are overdue, so they're not counted)",
      "= Order 780",
    ]);
    assert.equal(e.warning, undefined);
    assert.equal(1133 + 193, 1326);
    assert.equal(1326 - 546 - 0, 780);
  });

  test("SKU-1062 @ WH-WEST -> 1: unmeasurable swings and short history are called out", () => {
    const e = explainReorderQuantity({
      quantity: 1, dailyDemand: 0.55, leadTimeDays: 13, leadTimeMissing: false, supplierName: "X", reviewDays: 1,
      sigma: 0, safetyStock: 3.575, targetStock: 11, onHand: 10, inbound: [], overdue: [], historyDays: 11, activeDays: 1,
    });
    assert.equal(e.headline, "How we got 1 unit");
    assert.equal(e.lines[2], "· Safety buffer: 3.6 — only 1 day with sales, so day-to-day swings can't be measured yet; using half of lead-time demand instead (0.55 × 13 × 0.5)");
    assert.equal(e.lines[4], "− On order, arriving in time: 0");
    assert.equal(e.warning, "Early estimate: the daily rate is based on only 11 days of history.");
  });

  test("assumed lead time is stated, and credited inbound is listed", () => {
    const e = explainReorderQuantity({
      quantity: 40, dailyDemand: 5, leadTimeDays: 14, leadTimeMissing: true, supplierName: "Unassigned Supplier", reviewDays: 1,
      sigma: 2, safetyStock: 12.3, targetStock: 87, onHand: 20, inbound: [{ poNumber: "PO-20490", quantity: 27, arrives: "Oct 2" }], overdue: [], historyDays: 90, activeDays: 60,
    });
    assert.equal(e.lines[4], "− On order, arriving in time: 27 (PO-20490 · 27 units arriving Oct 2)");
    assert.equal(e.warning, "Lead time assumed 14 days — none on file for Unassigned Supplier. Add the real lead time to get an accurate quantity.");
  });
});

describe("supplier score explanation (approved wording)", () => {
  const suppliers = [
    { name: "Orion Electronics", otifPercent: 6.4, onTimeInFullCount: 3, eligiblePurchaseOrders: 47, totalSpend: 215263 },
    { name: "Harbor Freight Supply", otifPercent: 42.5, onTimeInFullCount: 17, eligiblePurchaseOrders: 40, totalSpend: 251151 },
    ...Array.from({ length: 6 }, (_, i) => ({ name: `S${i}`, otifPercent: 95, onTimeInFullCount: 19, eligiblePurchaseOrders: 20, totalSpend: 342055.67 })),
    { name: "Unassigned Supplier", otifPercent: null, onTimeInFullCount: 0, eligiblePurchaseOrders: 0, totalSpend: 0 },
  ];

  test("Production today: 81 across 8 suppliers, biggest drag, not scored, and the in-full caveat", () => {
    const e = explainSupplierScore({ score: 81, suppliers });
    assert.deepEqual(e.lines, [
      "81 / 100 — on-time-in-full rate across 8 suppliers, weighted by what you spent with each in the last 90 days ($2,518,748).",
      "Biggest drag: Orion Electronics — 3 of 47 POs on time (6.4%) on $215,263 of spend.",
      "Not scored: Unassigned Supplier — no received or overdue POs in 90 days.",
    ]);
    assert.equal(
      e.note,
      "On time = received on or before the expected date; open POs past their expected date count as late. Partial deliveries aren't recorded, so every received PO counts as in full.",
    );
  });

  test("no data", () => {
    assert.deepEqual(explainSupplierScore({ score: null, suppliers: [] }).lines, [
      "No data — no purchase orders were received or overdue in the last 90 days, so there's nothing to score yet.",
    ]);
  });
});
