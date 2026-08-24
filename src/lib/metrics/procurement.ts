/**
 * Procurement health metrics. See docs/metrics.md.
 */
import type { PurchaseOrder } from "@/types/supply-chain";
import { isOnTime, isInFull } from "./supplier";

/** % of received POs that arrived with the full ordered quantity. */
export function procurementFulfillmentScore(purchaseOrders: PurchaseOrder[]): number {
  const eligible = purchaseOrders.filter((po) => po.status === "received");
  if (eligible.length === 0) return 0;
  const inFull = eligible.filter(isInFull).length;
  return Math.round((inFull / eligible.length) * 100);
}

/** % of received POs that arrived on or before the expected date. */
export function procurementCycleTimeScore(purchaseOrders: PurchaseOrder[]): number {
  const eligible = purchaseOrders.filter((po) => po.status === "received");
  if (eligible.length === 0) return 0;
  const onTime = eligible.filter(isOnTime).length;
  return Math.round((onTime / eligible.length) * 100);
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
    if (po.status !== "received") continue;
    for (const line of po.lines) {
      const baseline = productBaselineCost.get(line.productId);
      if (!baseline || baseline <= 0) continue;
      deviations.push(Math.abs(line.unitCost - baseline) / baseline);
    }
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
