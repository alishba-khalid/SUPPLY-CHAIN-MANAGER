/**
 * Procurement health metrics. See docs/metrics.md.
 *
 * Schema note: `procurementFulfillmentScore` is structurally 100 whenever
 * any POs have been received, since this schema has no partial-receipt
 * quantity column (see supplier.ts's file header) — kept as its own
 * function, not inlined to a constant, so the composite formula stays
 * legible and the limitation stays visible at its source.
 */
import type { Product, PurchaseOrder } from "@/types/supply-chain";
import { isOnTime, isInFull, isOtif, poOnTimeRate, purchaseOrderValue } from "./supplier";
import { isWithinTrailingWindow } from "@/lib/dates";

const TRAILING_WINDOW_DAYS = 90;

/** % of purchase orders delivered on time and in full (OTIF) in the trailing 90-day window. Includes open overdue POs. */
export function procurementFulfillmentScore(
  purchaseOrders: PurchaseOrder[],
  windowDays: number = TRAILING_WINDOW_DAYS,
): number {
  const rate = poOnTimeRate(purchaseOrders, windowDays);
  return rate !== null ? Math.round(rate) : 0;
}

/** % of received POs that arrived on or before the expected date in the trailing 90-day window. */
export function procurementCycleTimeScore(
  purchaseOrders: PurchaseOrder[],
  windowDays: number = TRAILING_WINDOW_DAYS,
): number {
  const rate = poOnTimeRate(purchaseOrders, windowDays);
  return rate !== null ? Math.round(rate) : 0;
}

/** Mean days between `orderDate` and `receivedDate`, across received POs. */
export function averagePoCycleTimeDays(purchaseOrders: PurchaseOrder[]): number | null {
  const eligible = purchaseOrders.filter((po): po is PurchaseOrder & { receivedDate: string } => !!po.receivedDate);
  if (eligible.length === 0) return null;
  const days = eligible.map((po) => {
    const orderMs = new Date(`${po.orderDate}T00:00:00Z`).getTime();
    const receivedMs = new Date(`${po.receivedDate}T00:00:00Z`).getTime();
    return (receivedMs - orderMs) / 86_400_000;
  });
  return Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10;
}

/** (paid unit price - product's baseline unit cost) / baseline, as a %. Positive = paid more than baseline. */
export function priceVariancePercent(po: PurchaseOrder, product: Pick<Product, "unitCost">): number | null {
  if (product.unitCost <= 0) return null;
  return Math.round(((po.unitPrice - product.unitCost) / product.unitCost) * 1000) / 10;
}

/**
 * Compares what was actually paid per unit against each product's baseline
 * unit cost. 100 = no deviation; the score decays as average deviation
 * grows, reaching 0 at ~50% average deviation.
 */
export function procurementPriceStabilityScore(
  purchaseOrders: PurchaseOrder[],
  productBaselineCost: Map<string, number>,
): number {
  const deviations: number[] = [];
  for (const po of purchaseOrders) {
    if (!po.receivedDate) continue;
    const baseline = productBaselineCost.get(po.sku);
    if (!baseline || baseline <= 0) continue;
    deviations.push(Math.abs(po.unitPrice - baseline) / baseline);
  }
  if (deviations.length === 0) return 100;
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  return Math.min(100, Math.max(0, Math.round(100 - avgDeviation * 200)));
}

export function procurementHealthScore(
  purchaseOrders: PurchaseOrder[],
  productBaselineCost: Map<string, number>,
): number {
  const fulfillment = procurementFulfillmentScore(purchaseOrders);
  const cycleTime = procurementCycleTimeScore(purchaseOrders);
  const priceStability = procurementPriceStabilityScore(purchaseOrders, productBaselineCost);
  const score = fulfillment * 0.4 + cycleTime * 0.3 + priceStability * 0.3;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export { purchaseOrderValue };
