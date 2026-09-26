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
import { daysBetween, isWithinTrailingWindow, todayISODate } from "@/lib/dates";

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

/** % of eligible purchase orders (any supplier) delivered on or before their expected date. Includes open overdue POs. */
export function poOnTimeRate(purchaseOrders: PurchaseOrder[] = [], windowDays: number = TRAILING_WINDOW_DAYS): number | null {
  const today = todayISODate();
  const eligible = purchaseOrders.filter((po) => {
    if (po.receivedDate !== null) {
      return isWithinTrailingWindow(po.receivedDate, windowDays, today);
    }
    return po.expectedDate < today && isWithinTrailingWindow(po.expectedDate, windowDays, today);
  });
  if (eligible.length === 0) return null;
  const onTime = eligible.filter(isOtif).length;
  return Math.round((onTime / eligible.length) * 1000) / 10;
}

/**
 * Trailing 90-day OTIF for one supplier.
 * Eligible includes:
 * 1. Received purchase orders whose receipt fell inside the window.
 * 2. Open purchase orders that are currently overdue (past expectedDate within window).
 */
export function computeSupplierPerformance(
  supplierId: string,
  purchaseOrders: PurchaseOrder[] = [],
  windowDays: number = TRAILING_WINDOW_DAYS,
): SupplierPerformance {
  const today = todayISODate();
  const eligible = purchaseOrders.filter((po) => {
    if (po.supplierId !== supplierId) return false;
    if (po.receivedDate !== null) {
      return isWithinTrailingWindow(po.receivedDate, windowDays, today);
    }
    return po.expectedDate < today && isWithinTrailingWindow(po.expectedDate, windowDays, today);
  });

  const otifCount = eligible.filter(isOtif).length;
  const totalSpend = eligible.reduce((s, po) => s + purchaseOrderValue(po), 0);
  const closedOrders = eligible.filter((po) => po.receivedDate !== null);
  const leadTimes = closedOrders.map((po) => daysBetween(po.orderDate, po.receivedDate as string));
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

/**
 * Spend-weighted average OTIF across all suppliers with eligible orders.
 * Null when no supplier has any eligible order in the window — there is no
 * on-time record to score, which is not the same as scoring 0.
 */
export function supplierHealthScore(performances: SupplierPerformance[]): number | null {
  const withData = performances.filter((p) => p.otifPercent !== null && p.totalSpend > 0);
  const totalSpend = withData.reduce((s, p) => s + p.totalSpend, 0);
  if (totalSpend === 0) return null;
  const weighted = withData.reduce((s, p) => s + (p.otifPercent as number) * p.totalSpend, 0) / totalSpend;
  return Math.min(100, Math.max(0, Math.round(weighted)));
}

/**
 * Computes average lateness in days for a supplier on closed (received) purchase orders.
 * Only orders received late (receivedDate > expectedDate) contribute to the average lateness.
 * Returns null if the supplier has no eligible closed orders.
 */
export function supplierAverageDelayDays(
  supplierId: string,
  purchaseOrders: PurchaseOrder[] = [],
  windowDays: number = TRAILING_WINDOW_DAYS,
): number | null {
  const eligible = (purchaseOrders || []).filter(
    (po) => po.supplierId === supplierId && !!po.receivedDate && isWithinTrailingWindow(po.receivedDate, windowDays),
  );
  if (eligible.length === 0) return null;

  const lateOrders = eligible.filter((po) => (po.receivedDate as string) > po.expectedDate);
  if (lateOrders.length === 0) return 0;

  const totalLateDays = lateOrders.reduce(
    (sum, po) => sum + daysBetween(po.expectedDate, po.receivedDate as string),
    0,
  );
  return Math.round((totalLateDays / lateOrders.length) * 10) / 10;
}

