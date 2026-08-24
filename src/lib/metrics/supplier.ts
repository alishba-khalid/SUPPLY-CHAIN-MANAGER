/**
 * Supplier performance (OTIF) metrics. See docs/metrics.md.
 */
import type { PurchaseOrder, SupplierPerformance } from "@/types/supply-chain";
import { daysBetween, isWithinTrailingWindow } from "@/data/mock/dates";

const TRAILING_WINDOW_DAYS = 90;

export function isOnTime(po: PurchaseOrder): boolean {
  return !!po.actualDeliveryDate && po.actualDeliveryDate <= po.expectedDeliveryDate;
}

export function isInFull(po: PurchaseOrder): boolean {
  const ordered = po.lines.reduce((s, l) => s + l.orderedQuantity, 0);
  const received = po.lines.reduce((s, l) => s + l.receivedQuantity, 0);
  return ordered > 0 && received >= ordered;
}

export function isOtif(po: PurchaseOrder): boolean {
  return isOnTime(po) && isInFull(po);
}

/**
 * Trailing 90-day OTIF for one supplier. Eligible = received purchase
 * orders whose actual delivery fell inside the window (cancelled and
 * still-in-flight orders are excluded — they haven't produced a delivery
 * outcome yet).
 */
export function computeSupplierPerformance(
  supplierId: string,
  purchaseOrders: PurchaseOrder[],
  windowDays: number = TRAILING_WINDOW_DAYS,
): SupplierPerformance {
  const eligible = purchaseOrders.filter(
    (po) =>
      po.supplierId === supplierId &&
      po.status === "received" &&
      !!po.actualDeliveryDate &&
      isWithinTrailingWindow(po.actualDeliveryDate, windowDays),
  );

  const otifCount = eligible.filter(isOtif).length;
  const totalSpend = eligible.reduce((s, po) => s + po.purchaseOrderValue, 0);
  const leadTimes = eligible.map((po) => daysBetween(po.orderedDate, po.actualDeliveryDate as string));
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
