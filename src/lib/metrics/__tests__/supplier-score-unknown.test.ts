import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { computeSupplierPerformance, supplierHealthScore } from "../supplier";
import { overallHealthScore } from "../health";
import { buildHealthScoreAlerts } from "@/lib/insights/health-alerts";
import { addDays, todayISODate } from "@/lib/dates";
import type { PurchaseOrder } from "@/types/supply-chain";

const today = todayISODate();
const po = (over: Partial<PurchaseOrder>): PurchaseOrder => ({
  id: 1, poNumber: "PO-1", supplierId: "SUP-1", sku: "SKU-1", quantity: 10, unitPrice: 10,
  orderDate: addDays(today, -40), expectedDate: addDays(today, -20), receivedDate: addDays(today, -21), ...over,
});

describe("supplier score: no data is not 0", () => {
  test("no eligible POs in the last 90 days -> null, not 0", () => {
    // Only an open PO that isn't due yet: nothing to score.
    const perfs = [computeSupplierPerformance("SUP-1", [po({ expectedDate: addDays(today, 10), receivedDate: null })])];
    assert.equal(perfs[0].otifPercent, null);
    assert.equal(supplierHealthScore(perfs), null);
    assert.equal(supplierHealthScore([]), null, "no suppliers at all");
  });

  test("real data still scores, including a genuine 0", () => {
    assert.equal(supplierHealthScore([computeSupplierPerformance("SUP-1", [po({})])]), 100, "received on time");
    const late = po({ expectedDate: addDays(today, -20), receivedDate: addDays(today, -10) });
    assert.equal(supplierHealthScore([computeSupplierPerformance("SUP-1", [late])]), 0, "received late: a real 0");
  });

  test("overall health leaves an unknown supplier score out instead of counting it as 0", () => {
    const withUnknown = overallHealthScore({ inventory: 80, supplier: null, procurement: 80, logistics: 80, warehouse: 80 });
    assert.equal(withUnknown.supplier, null);
    assert.equal(withUnknown.overall, 80, "unknown supplier doesn't pull 80s down");
    const withZero = overallHealthScore({ inventory: 80, supplier: 0, procurement: 80, logistics: 80, warehouse: 80 });
    assert.equal(withZero.overall, 64, "a real 0 still counts: 80 x 0.8");
  });

  test("both supplier and warehouse unknown -> weighted average of the three known parts", () => {
    // (0.3 x 90 + 0.2 x 60 + 0.2 x 60) / (0.3 + 0.2 + 0.2) = 51 / 0.7 = 72.9 -> 73
    assert.equal(overallHealthScore({ inventory: 90, supplier: null, procurement: 60, logistics: 60, warehouse: null }).overall, 73);
  });

  test("no 'Supplier health is critical' alert when there's no supplier data; a real low score still alerts", () => {
    const ctx = (score: number | null) => ({
      inventory: { score: 100, unhealthyCount: 0, totalCount: 1 },
      supplier: { score },
      procurement: { score: 100, fulfillment: 100, cycleTime: 100, priceStability: 100 },
      logistics: { score: 100, onTimeRate: 100 },
      warehouse: { score: null, worst: null },
    });
    assert.equal(buildHealthScoreAlerts(ctx(null)).some((a) => a.id === "ALT-HEALTH-SUPPLIER"), false);
    assert.equal(buildHealthScoreAlerts(ctx(20)).some((a) => a.id === "ALT-HEALTH-SUPPLIER"), true);
  });
});
