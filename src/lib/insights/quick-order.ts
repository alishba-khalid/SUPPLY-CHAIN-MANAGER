/**
 * Purchase orders issued from an alert or suggestion ("quick order"). A
 * supplier, order quantity or unit price that isn't known is kept as null —
 * never replaced with a default. The user must enter a real quantity and unit
 * price; a PO with no assigned supplier can't be issued at all. The server
 * re-checks this in createPoFromSuggestionAction.
 */
import type { Product, Supplier, SupplyChainAlert, Warehouse } from "@/types/supply-chain";
import type { SuggestedPurchaseOrder } from "@/lib/forecasting/demand-forecast";

/** Placeholder supplier the importer attaches to products imported without one. */
export const UNASSIGNED_SUPPLIER_ID = "SUP-UNASSIGNED";

/** A suggestion whose supplier, order quantity or unit price may be unknown (null). */
export type PoDraft = Omit<
  SuggestedPurchaseOrder,
  "supplierId" | "supplierName" | "suggestedQuantity" | "unitPrice" | "estimatedCost"
> & {
  supplierId: string | null;
  supplierName: string | null;
  suggestedQuantity: number | null;
  unitPrice: number | null;
};

/** The supplier id to order from, or null when none is really assigned (missing or the importer's placeholder). */
export function assignedSupplierId(supplierId: string | null | undefined): string | null {
  const id = supplierId?.trim();
  return id && id !== UNASSIGNED_SUPPLIER_ID ? id : null;
}

/** A positive number, or null for missing / zero / negative (e.g. a product imported without a cost). */
export function knownPositive(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** A positive, finite number typed by the user (whole number when `integer`), or null. */
export function parsePositiveInput(text: string, integer: boolean): number | null {
  if (text.trim() === "") return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (integer && !Number.isInteger(n)) return null;
  return n;
}

export function quickOrderDraft(
  alert: SupplyChainAlert & { sku: string },
  product: Product | undefined,
  supplier: Supplier | undefined,
  warehouse: Warehouse | undefined,
): PoDraft {
  const quantity = knownPositive(alert.suggestedQuantity);
  // Only a real supplier on file for this product — never a default like SUP-001.
  const orderFrom = supplier && assignedSupplierId(product?.supplierId) === supplier.supplierId ? supplier : undefined;
  return {
    id: `SUG-${alert.id}`,
    sku: alert.sku,
    productName: product?.name || alert.sku,
    category: product?.category || "general",
    supplierId: orderFrom?.supplierId ?? null,
    supplierName: orderFrom?.name ?? null,
    supplierLeadTimeDays: orderFrom?.leadTimeDays || 14,
    warehouseId: alert.warehouseId || 1,
    warehouseCode: warehouse?.code || "WH-1",
    currentOnHand: 0,
    targetStock: quantity ?? 0,
    inboundQuantity: 0,
    reorderPoint: 0,
    dailyDemand: 0,
    dailyDemandSigma: 0,
    safetyStock: 0,
    suggestedQuantity: quantity,
    actionType: "reorder",
    unitPrice: knownPositive(product ? Number(product.unitCost) : null),
    daysOfCoverCurrent: null,
    daysOfCoverProjected: 30,
    reasoning: alert.description,
    reorderBreakdown: alert.reorderBreakdown,
  };
}

/** Server-side check: why this PO can't be issued, or null when supplier, quantity and unit price are all real. */
export function invalidSuggestedPoReason({
  supplierId,
  quantity,
  unitPrice,
}: {
  supplierId: unknown;
  quantity: unknown;
  unitPrice: unknown;
}): string | null {
  if (typeof supplierId !== "string" || assignedSupplierId(supplierId) === null) {
    return "No supplier is assigned to this product. Assign one before issuing a PO.";
  }
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
    return "Enter an order quantity (a whole number of units above 0) before issuing this PO.";
  }
  if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    return "Enter the unit cost (above $0) before issuing this PO.";
  }
  return null;
}
