/**
 * Supplier performance (OTIF) metrics. See docs/metrics.md.
 *
 * Schema note: this pass's purchase_orders table has no separate
 * received-quantity column — a row is either not yet received
 * (`receivedDate` null) or received, with no partial-receipt state. So
 * "in full" is structurally guaranteed true for every received row;
 * `isInFull` is kept as an explicit function (rather than inlined away) so
 * the OTIF formula stays legible and this simplification is documented at
 * its source, not silently dropped.
 */
import type { PurchaseOrder, SupplierPerformance } from "@/types/supply-chain";
import { daysBetween, isWithinTrailingWindow } from "@/lib/dates";

const TRAILING_WINDOW_DAYS = 90;

export function isOnTime(po: PurchaseOrder): boolean {
  return !!po.receivedDate && po.receivedDate <= po.expectedDate;
}

/** Always true in this schema — see the file header. */
export function isInFull(po: PurchaseOrder): boolean {
  return !!po.receivedDate;
}

export function isOtif(po: PurchaseOrder): boolean {
  return isOnTime(po) && isInFull(po);
}

export function purchaseOrderValue(po: PurchaseOrder): number {
  return po.quantity * po.unitPrice;
}

/** % of received purchase orders (any supplier) delivered on or before their expected date. */
export function poOnTimeRate(purchaseOrders: PurchaseOrder[], windowDays: number = TRAILING_WINDOW_DAYS): number | null {
  const eligible = purchaseOrders.filter((po) => !!po.receivedDate && isWithinTrailingWindow(po.receivedDate, windowDays));
  if (eligible.length === 0) return null;
  const onTime = eligible.filter(isOnTime).length;
  return Math.round((onTime / eligible.length) * 1000) / 10;
}

/**
 * Trailing 90-day OTIF for one supplier. Eligible = received purchase
 * orders whose receipt fell inside the window (still-open orders are
 * excluded — they haven't produced a delivery outcome yet).
 */
export function computeSupplierPerformance(
  supplierId: string,
  purchaseOrders: PurchaseOrder[],
  windowDays: number = TRAILING_WINDOW_DAYS,
): SupplierPerformance {
  const eligible = purchaseOrders.filter(
    (po) => po.supplierId === supplierId && !!po.receivedDate && isWithinTrailingWindow(po.receivedDate, windowDays),
  );

  const otifCount = eligible.filter(isOtif).length;
  const totalSpend = eligible.reduce((s, po) => s + purchaseOrderValue(po), 0);
  const leadTimes = eligible.map((po) => daysBetween(po.orderDate, po.receivedDate as string));
  const avgLeadTime = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null;

  return {
    supplierId,
    windowDays,
    eligiblePurchaseOrders: eligible.length,
    onTimeInFullCount: otifCount,
    otifPercent: eligible.length ? Math.round((otifCount / eligible.length) * 1000) / 10 : null,
    averageLeadTimeDays: avgLeadTime !== null ? Math.round(avgLeadTime * 10) / 10 : null,
    totalSpend: Math.round(totalSpend * 100) / 100,
  };
}

/** Spend-weighted average OTIF across all suppliers with eligible orders. */
export function supplierHealthScore(performances: SupplierPerformance[]): number {
  const withData = performances.filter((p) => p.otifPercent !== null && p.totalSpend > 0);
  const totalSpend = withData.reduce((s, p) => s + p.totalSpend, 0);
  if (totalSpend === 0) return 0;
  const weighted = withData.reduce((s, p) => s + (p.otifPercent as number) * p.totalSpend, 0) / totalSpend;
  return Math.min(100, Math.max(0, Math.round(weighted)));
}
