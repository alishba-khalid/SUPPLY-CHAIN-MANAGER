/**
 * Logistics metrics. See docs/metrics.md.
 */
import type { Shipment } from "@/types/supply-chain";
import { isWithinTrailingWindow } from "@/data/mock/dates";

const TRAILING_WINDOW_DAYS = 90;

export function isShipmentOnTime(shipment: Shipment): boolean {
  return !!shipment.actualDeliveryDate && shipment.actualDeliveryDate <= shipment.expectedDeliveryDate;
}

/**
 * % of delivered shipments (trailing 90 days) that arrived on or before
 * the expected date. "delayed" is a live status (still in transit, past
 * due) rather than a completed outcome, so it isn't eligible here — only
 * a shipment that has actually arrived has an on-time/late result to
 * measure.
 */
export function onTimeShipmentRate(
  shipments: Shipment[],
  windowDays: number = TRAILING_WINDOW_DAYS,
): number | null {
  const eligible = shipments.filter(
    (s) => s.status === "delivered" && !!s.actualDeliveryDate && isWithinTrailingWindow(s.actualDeliveryDate, windowDays),
  );
  if (eligible.length === 0) return null;
  const onTime = eligible.filter(isShipmentOnTime).length;
  return Math.round((onTime / eligible.length) * 1000) / 10;
}

export function logisticsHealthScore(shipments: Shipment[], windowDays: number = TRAILING_WINDOW_DAYS): number {
  const rate = onTimeShipmentRate(shipments, windowDays);
  if (rate === null) return 0;
  return Math.min(100, Math.max(0, Math.round(rate)));
}
