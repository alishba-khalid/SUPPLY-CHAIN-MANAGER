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

describe("quick order never defaults the supplier", () => {
  test("product imported without a supplier (SUP-UNASSIGNED placeholder) -> no supplier, not SUP-001", () => {
    const unassigned: Supplier = { ...supplier, supplierId: "SUP-UNASSIGNED", name: "Unassigned Supplier" };
    const draft = quickOrderDraft(alert, { ...product(2), supplierId: "SUP-UNASSIGNED" }, unassigned, warehouse);
    assert.equal(draft.supplierId, null);
    assert.equal(draft.supplierName, null);
  });

  test("product not found -> no supplier (the alert's own supplierId isn't used as a fallback)", () => {
    const draft = quickOrderDraft({ ...alert, supplierId: "SUP-009" }, undefined, undefined, warehouse);
    assert.equal(draft.supplierId, null);
  });

  test("product's supplier missing from the supplier list -> no supplier", () => {
    assert.equal(quickOrderDraft(alert, product(2), undefined, warehouse).supplierId, null);
  });

  test("a real assigned supplier passes through", () => {
    const draft = quickOrderDraft(alert, product(2), supplier, warehouse);
    assert.equal(draft.supplierId, "SUP-001");
    assert.equal(draft.supplierName, "Supplier");
  });
});

describe("server refuses a PO without real values", () => {
  const ok = { supplierId: "SUP-001", quantity: 100, unitPrice: 3.5 };

  test("missing or placeholder supplier is rejected", () => {
    for (const supplierId of [null, undefined, "", "  ", "SUP-UNASSIGNED"]) {
      assert.match(invalidSuggestedPoReason({ ...ok, supplierId }) ?? "", /No supplier is assigned/);
    }
  });

  test("missing or non-positive quantity is rejected", () => {
    for (const quantity of [null, undefined, 0, -10, 2.5, NaN]) {
      assert.match(invalidSuggestedPoReason({ ...ok, quantity }) ?? "", /order quantity/);
    }
  });

  test("missing or non-positive unit price is rejected", () => {
    for (const unitPrice of [null, undefined, 0, -1, NaN, Infinity]) {
      assert.match(invalidSuggestedPoReason({ ...ok, unitPrice }) ?? "", /unit cost/);
    }
  });

  test("real supplier, quantity and price are accepted", () => {
    assert.equal(invalidSuggestedPoReason(ok), null);
  });
});
