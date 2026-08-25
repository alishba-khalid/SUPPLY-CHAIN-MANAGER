/**
 * Logistics metrics. See docs/metrics.md.
 *
 * Schema note: this pass's schema has no shipments table (see docs), so
 * "logistics" is redefined as inbound purchase-order on-time delivery
 * rate — the closest honest equivalent available. It intentionally reuses
 * `poOnTimeRate` from supplier.ts (same underlying receipt-timing data as
 * part of procurement's cycle-time score); that overlap is a disclosed
 * limitation of the narrower schema, not a bug.
 */
import type { PurchaseOrder } from "@/types/supply-chain";
import { poOnTimeRate } from "./supplier";

export function logisticsHealthScore(purchaseOrders: PurchaseOrder[]): number {
  const rate = poOnTimeRate(purchaseOrders);
  if (rate === null) return 0;
  return Math.min(100, Math.max(0, Math.round(rate)));
}
