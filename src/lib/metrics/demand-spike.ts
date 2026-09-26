/**
 * Demand spike detection. See docs/metrics.md ("Demand spike") for the
 * business definition and worked examples.
 *
 * Compares the last SPIKE_RECENT_DAYS of sales for a SKU at a warehouse
 * against its usual rate over the SPIKE_BASELINE_DAYS *before* that week, so
 * the week being tested never inflates its own baseline. The usual rate and
 * its variability come from the same outlier-resistant trimmed average and
 * winsorized σ used everywhere else in inventory metrics.
 */
import type { InventoryTransaction } from "@/types/supply-chain";
import { addDays, isWithinTrailingWindow, todayISODate } from "@/lib/dates";
import { trimmedDailyDemand, winsorizedDailyDemandStandardDeviation } from "./inventory";

export const SPIKE_RECENT_DAYS = 7;
export const SPIKE_BASELINE_DAYS = 90;
/** Recent sales must be at least this multiple of the usual rate… */
export const SPIKE_RATIO = 3;
/** …and this many standard deviations above it, so erratic/intermittent SKUs' normal lumps don't count… */
export const SPIKE_SIGMAS = 3;
/** …and this many units above it, so low-volume SKUs (1/week → 4) don't count. */
export const SPIKE_MIN_EXCESS_UNITS = 10;
/** Fewer selling days than this in the baseline means there is no reliable "usual rate". */
export const SPIKE_MIN_BASELINE_ACTIVE_DAYS = 10;

/**
 * "sustained": the week is still a spike with its single biggest day removed.
 * "single_order": one day's sales account for the jump (e.g. a one-off bulk order).
 */
export type DemandSpikeKind = "sustained" | "single_order";

export interface DemandSpike {
  sku: string;
  warehouseId: number;
  kind: DemandSpikeKind;
  /** Units sold in the last SPIKE_RECENT_DAYS. */
  recentUnits: number;
  /** Usual rate × SPIKE_RECENT_DAYS. */
  expectedUnits: number;
  baselineDailyDemand: number;
  excessUnits: number;
  /** recentUnits / expectedUnits, 1 decimal. */
  ratio: number;
  recentActiveDays: number;
  largestDay: { date: string; units: number };
}

function isSpike(units: number, expectedUnits: number, sigmaForWindow: number): boolean {
  return (
    units >= expectedUnits * SPIKE_RATIO &&
    units >= expectedUnits + SPIKE_SIGMAS * sigmaForWindow &&
    units - expectedUnits >= SPIKE_MIN_EXCESS_UNITS
  );
}

/** Returns null when there is no spike, or when there isn't enough history to know the usual rate. */
export function detectDemandSpike(
  transactions: InventoryTransaction[],
  sku: string,
  warehouseId: number,
  today: string = todayISODate(),
): DemandSpike | null {
  const baselineEnd = addDays(today, -SPIKE_RECENT_DAYS);
  const baselineStart = addDays(baselineEnd, -(SPIKE_BASELINE_DAYS - 1));

  let firstSeen: string | null = null;
  const recentByDay = new Map<string, number>();
  const baselineActiveDays = new Set<string>();
  for (const t of transactions) {
    if (t.sku !== sku || t.warehouseId !== warehouseId) continue;
    if (firstSeen === null || t.date < firstSeen) firstSeen = t.date;
    if (t.direction !== "OUT" || t.quantity <= 0) continue;
    if (isWithinTrailingWindow(t.date, SPIKE_RECENT_DAYS, today)) {
      recentByDay.set(t.date, (recentByDay.get(t.date) ?? 0) + t.quantity);
    } else if (isWithinTrailingWindow(t.date, SPIKE_BASELINE_DAYS, baselineEnd)) {
      baselineActiveDays.add(t.date);
    }
  }

  // History must reach back over the whole baseline window; otherwise the days
  // before the data began would be read as zero sales and understate the usual rate.
  if (firstSeen === null || firstSeen > baselineStart) return null;
  if (baselineActiveDays.size < SPIKE_MIN_BASELINE_ACTIVE_DAYS) return null;
  if (recentByDay.size === 0) return null;

  const baselineDailyDemand = trimmedDailyDemand(transactions, sku, warehouseId, SPIKE_BASELINE_DAYS, 0.05, 20, baselineEnd);
  if (baselineDailyDemand === null || baselineDailyDemand <= 0) return null;
  const sigmaDaily = winsorizedDailyDemandStandardDeviation(transactions, sku, warehouseId, SPIKE_BASELINE_DAYS, 0.05, baselineEnd);

  const expectedUnits = baselineDailyDemand * SPIKE_RECENT_DAYS;
  const sigmaForWindow = sigmaDaily * Math.sqrt(SPIKE_RECENT_DAYS);
  const recentUnits = [...recentByDay.values()].reduce((a, b) => a + b, 0);
  if (!isSpike(recentUnits, expectedUnits, sigmaForWindow)) return null;

  let largestDay = { date: "", units: 0 };
  for (const [date, units] of [...recentByDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (units > largestDay.units) largestDay = { date, units };
  }
  const kind: DemandSpikeKind = isSpike(recentUnits - largestDay.units, expectedUnits, sigmaForWindow)
    ? "sustained"
    : "single_order";

  return {
    sku,
    warehouseId,
    kind,
    recentUnits,
    expectedUnits: Math.round(expectedUnits * 10) / 10,
    baselineDailyDemand,
    excessUnits: Math.round((recentUnits - expectedUnits) * 10) / 10,
    ratio: Math.round((recentUnits / expectedUnits) * 10) / 10,
    recentActiveDays: recentByDay.size,
    largestDay,
  };
}
