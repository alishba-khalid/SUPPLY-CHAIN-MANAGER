/**
 * Weekly trend series for the Overview page. See docs/metrics.md.
 *
 * Every trend here reuses the same trailing-window convention as the rest
 * of the app (`isWithinTrailingWindow`), just applied once per week bucket
 * instead of once over the whole window.
 */
import type { InventoryTransaction, PurchaseOrder, TrendPoint } from "@/types/supply-chain";
import { addDays, todayISODate } from "@/lib/dates";
import { isOnTime, purchaseOrderValue } from "./supplier";

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
export function weekBuckets(windowWeeks: number = TRAILING_WEEKS, reference: string = todayISODate()): WeekBucket[] {
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

/** Weekly spend across received purchase orders, keyed on `receivedDate`. */
export function procurementSpendTrend(
  purchaseOrders: PurchaseOrder[],
  windowWeeks: number = TRAILING_WEEKS,
): TrendPoint[] {
  const buckets = weekBuckets(windowWeeks);
  const entries = purchaseOrders
    .filter((po) => !!po.receivedDate)
    .map((po) => ({ date: po.receivedDate as string, value: purchaseOrderValue(po) }));
  return sumByBucket(entries, buckets).map((p) => ({ ...p, value: Math.round(p.value * 100) / 100 }));
}

/**
 * Weekly on-time rate across received purchase orders, keyed on `receivedDate`.
 * A week with zero receipts plots as `0`, since a chart series cannot
 * represent a `null` gap as cleanly as a scalar metric can.
 */
export function onTimeShipmentRateTrend(
  purchaseOrders: PurchaseOrder[],
  windowWeeks: number = TRAILING_WEEKS,
): TrendPoint[] {
  const buckets = weekBuckets(windowWeeks);
  const received = purchaseOrders.filter((po) => !!po.receivedDate);
  return buckets.map((bucket) => {
    const eligible = received.filter((po) => inBucket(po.receivedDate as string, bucket));
    const rate = eligible.length === 0 ? 0 : (eligible.filter(isOnTime).length / eligible.length) * 100;
    return { periodStart: bucket.start, label: bucket.label, value: Math.round(rate * 10) / 10 };
  });
}

/** Weekly count of purchase orders placed, keyed on `orderDate`. */
export function poVolumeTrend(
  purchaseOrders: PurchaseOrder[],
  windowWeeks: number = TRAILING_WEEKS,
): TrendPoint[] {
  const buckets = weekBuckets(windowWeeks);
  const entries = purchaseOrders.map((po) => ({ date: po.orderDate, value: po.quantity }));
  return sumByBucket(entries, buckets);
}

/** Weekly inbound (RECEIPT via transactions IN) vs outbound (OUT) units, keyed on `date`. */
export function inventoryMovementTrend(
  transactions: InventoryTransaction[],
  windowWeeks: number = TRAILING_WEEKS,
): { inbound: TrendPoint[]; outbound: TrendPoint[] } {
  const buckets = weekBuckets(windowWeeks);
  const inbound = transactions.filter((t) => t.direction === "IN").map((t) => ({ date: t.date, value: t.quantity }));
  const outbound = transactions.filter((t) => t.direction === "OUT").map((t) => ({ date: t.date, value: t.quantity }));
  return {
    inbound: sumByBucket(inbound, buckets),
    outbound: sumByBucket(outbound, buckets),
  };
}
