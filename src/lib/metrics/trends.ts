/**
 * Weekly trend series for the Overview page. See docs/metrics.md.
 *
 * Every trend here reuses the same trailing-window convention as the rest
 * of the app (`isWithinTrailingWindow`), just applied once per week bucket
 * instead of once over the whole window.
 */
import type { CustomerOrder, InventoryTransaction, PurchaseOrder, Shipment, TrendPoint } from "@/types/supply-chain";
import { addDays, REFERENCE_DATE } from "@/data/mock/dates";
import { isShipmentOnTime } from "./logistics";

const TRAILING_WEEKS = 12;
const BUCKET_DAYS = 7;

export interface WeekBucket {
  start: string; // exclusive lower bound
  end: string; // inclusive upper bound
  label: string;
}

/**
 * `windowWeeks` trailing 7-day buckets ending at `reference`, oldest first.
 * Each bucket is `(start, end]`, exactly mirroring `isWithinTrailingWindow`.
 */
export function weekBuckets(windowWeeks: number = TRAILING_WEEKS, reference: string = REFERENCE_DATE): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  for (let weeksAgo = windowWeeks - 1; weeksAgo >= 0; weeksAgo--) {
    const end = addDays(reference, -BUCKET_DAYS * weeksAgo);
    const start = addDays(end, -BUCKET_DAYS);
    buckets.push({ start, end, label: formatWeekLabel(end) });
  }
  return buckets;
}

function formatWeekLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function inBucket(date: string, bucket: WeekBucket): boolean {
  return date > bucket.start && date <= bucket.end;
}

function sumByBucket(
  entries: { date: string; value: number }[],
  buckets: WeekBucket[],
): TrendPoint[] {
  return buckets.map((bucket) => ({
    periodStart: bucket.start,
    label: bucket.label,
    value: entries.filter((e) => inBucket(e.date, bucket)).reduce((sum, e) => sum + e.value, 0),
  }));
}

/** Weekly spend across received purchase orders, keyed on `actualDeliveryDate`. */
export function procurementSpendTrend(
  purchaseOrders: PurchaseOrder[],
  windowWeeks: number = TRAILING_WEEKS,
): TrendPoint[] {
  const buckets = weekBuckets(windowWeeks);
  const entries = purchaseOrders
    .filter((po) => po.status === "received" && !!po.actualDeliveryDate)
    .map((po) => ({ date: po.actualDeliveryDate as string, value: po.purchaseOrderValue }));
  return sumByBucket(entries, buckets).map((p) => ({ ...p, value: Math.round(p.value * 100) / 100 }));
}

/**
 * Weekly on-time rate across delivered shipments, keyed on `actualDeliveryDate`.
 * A week with zero delivered shipments plots as `0`, since a chart series
 * cannot represent `null` gaps as cleanly as a scalar metric can.
 */
export function onTimeShipmentRateTrend(
  shipments: Shipment[],
  windowWeeks: number = TRAILING_WEEKS,
): TrendPoint[] {
  const buckets = weekBuckets(windowWeeks);
  const delivered = shipments.filter((s) => s.status === "delivered" && !!s.actualDeliveryDate);
  return buckets.map((bucket) => {
    const eligible = delivered.filter((s) => inBucket(s.actualDeliveryDate as string, bucket));
    const rate = eligible.length === 0 ? 0 : (eligible.filter(isShipmentOnTime).length / eligible.length) * 100;
    return { periodStart: bucket.start, label: bucket.label, value: Math.round(rate * 10) / 10 };
  });
}

/** Weekly units shipped across fulfilled customer orders, keyed on `fulfilledDate`. */
export function orderVolumeTrend(
  customerOrders: CustomerOrder[],
  windowWeeks: number = TRAILING_WEEKS,
): TrendPoint[] {
  const buckets = weekBuckets(windowWeeks);
  const entries = customerOrders
    .filter((co) => co.status === "fulfilled" && !!co.fulfilledDate)
    .map((co) => ({
      date: co.fulfilledDate as string,
      value: co.lines.reduce((sum, line) => sum + line.quantity, 0),
    }));
  return sumByBucket(entries, buckets);
}

/** Weekly inbound (RECEIPT+TRANSFER_IN) vs outbound (SALE+TRANSFER_OUT) units, keyed on `date`. */
export function inventoryMovementTrend(
  transactions: InventoryTransaction[],
  windowWeeks: number = TRAILING_WEEKS,
): { inbound: TrendPoint[]; outbound: TrendPoint[] } {
  const buckets = weekBuckets(windowWeeks);
  const inbound = transactions
    .filter((t) => t.type === "RECEIPT" || t.type === "TRANSFER_IN")
    .map((t) => ({ date: t.date, value: t.quantity }));
  const outbound = transactions
    .filter((t) => t.type === "SALE" || t.type === "TRANSFER_OUT")
    .map((t) => ({ date: t.date, value: t.quantity }));
  return {
    inbound: sumByBucket(inbound, buckets),
    outbound: sumByBucket(outbound, buckets),
  };
}
