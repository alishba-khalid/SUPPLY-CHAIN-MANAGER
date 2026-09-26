import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { invalidSuggestedPoReason, parsePositiveInput, quickOrderDraft } from "../quick-order";
import type { Product, Supplier, SupplyChainAlert, Warehouse } from "@/types/supply-chain";

const alert: SupplyChainAlert & { sku: string } = {
  id: "ALT-INV-STOCKOUT-SKU-1-1",
  category: "inventory",
  severity: "critical",
  title: "t",
  description: "d",
  sku: "SKU-1",
  warehouseId: 1,
  createdAt: "2026-09-26T00:00:00.000Z",
};
const product = (unitCost: number): Product => ({ id: 1, sku: "SKU-1", name: "Part", category: "parts", unitCost, supplierId: "SUP-001" });
const supplier: Supplier = { id: 1, supplierId: "SUP-001", name: "Supplier", leadTimeDays: 14, leadTimeMissing: false, email: "a@b.c" };
const warehouse: Warehouse = { id: 1, code: "NDC", name: "NDC", capacityUnits: 1000 };

describe("quick order never invents a quantity or unit cost", () => {
  test("no suggested quantity and a product with no cost -> both stay unknown (was 500 units at $10)", () => {
    const draft = quickOrderDraft(alert, product(0), supplier, warehouse);
    assert.equal(draft.suggestedQuantity, null);
    assert.equal(draft.unitPrice, null);
    assert.equal("estimatedCost" in draft, false, "no spend is computed from unknown values");
  });

  test("product not found at all -> unit cost unknown, not $10", () => {
    assert.equal(quickOrderDraft({ ...alert, suggestedQuantity: 40 }, undefined, supplier, warehouse).unitPrice, null);
  });

  test("real values pass through unchanged", () => {
    const draft = quickOrderDraft({ ...alert, suggestedQuantity: 250 }, product(2.5), supplier, warehouse);
    assert.equal(draft.suggestedQuantity, 250);
    assert.equal(draft.unitPrice, 2.5);
  });

  test("a 0 suggested quantity is unknown, not an order for 0 or 500", () => {
    assert.equal(quickOrderDraft({ ...alert, suggestedQuantity: 0 }, product(2), supplier, warehouse).suggestedQuantity, null);
  });
});

describe("user-entered values", () => {
  test("quantity must be a whole number above 0", () => {
    assert.equal(parsePositiveInput("120", true), 120);
    for (const bad of ["", "  ", "0", "-5", "2.5", "abc", "Infinity"]) assert.equal(parsePositiveInput(bad, true), null, `"${bad}"`);
  });

  test("unit cost may have decimals but must be above 0", () => {
    assert.equal(parsePositiveInput("3.75", false), 3.75);
    for (const bad of ["", "0", "-1", "abc"]) assert.equal(parsePositiveInput(bad, false), null, `"${bad}"`);
  });
});

describe("server refuses a PO without real values", () => {
  test("missing or non-positive quantity is rejected", () => {
    for (const q of [null, undefined, 0, -10, 2.5, NaN]) assert.match(invalidSuggestedPoReason(q, 3) ?? "", /order quantity/);
  });

  test("missing or non-positive unit price is rejected", () => {
    for (const p of [null, undefined, 0, -1, NaN, Infinity]) assert.match(invalidSuggestedPoReason(100, p) ?? "", /unit cost/);
  });

  test("real quantity and price are accepted", () => {
    assert.equal(invalidSuggestedPoReason(100, 3.5), null);
  });
});
