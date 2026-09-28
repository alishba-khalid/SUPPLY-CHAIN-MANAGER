/**
 * Inventory metrics. See docs/metrics.md for business definitions,
 * assumptions, and worked examples.
 */
import type { InventoryStatus, InventoryTransaction, InventoryInsight } from "@/types/supply-chain";
import { isWithinTrailingWindow, todayISODate, addDays, daysBetween } from "@/lib/dates";

const TRAILING_WINDOW_DAYS = 90;
const STOCK_OUT_RISK_DAYS = 3;
const SLOW_MOVING_DAYS = 180;

/** Default constant: 95% service level factor under standard normal distribution (Z = 1.65) */
export const DEFAULT_SERVICE_LEVEL_Z = 1.65;

/** Continuous daily review model: orders and stock are evaluated on a 1-day cycle */
export const REVIEW_PERIOD_DAYS = 1;

export type DemandVariabilityClass = "X" | "Y" | "Z";

/**
 * Standard XYZ demand-variability classification from the coefficient of
 * variation (σ/μ): X = steady demand, Y = moderate variability, Z = erratic
 * or intermittent. Used as the local (non-Python-service) fallback — the
 * live forecasting microservice returns its own xyz_class per series when
 * reachable; this keeps the grid classified even when it is not.
 */
export function classifyDemandVariability(dailyDemandSigma: number, dailyDemand: number): DemandVariabilityClass {
  if (dailyDemand <= 0) return "Z";
  const cv = dailyDemandSigma / dailyDemand;
  if (cv < 0.5) return "X";
  if (cv <= 1.0) return "Y";
  return "Z";
}

export function trailingOutboundQuantity(
  transactions: InventoryTransaction[],
  sku: string,
  warehouseId: number,
  windowDays: number = TRAILING_WINDOW_DAYS,
): number {
  return transactions.reduce((sum, t) => {
    if (t.sku !== sku || t.warehouseId !== warehouseId) return sum;
    if (t.direction !== "OUT") return sum;
    if (!isWithinTrailingWindow(t.date, windowDays)) return sum;
    return sum + t.quantity;
  }, 0);
}

/**
 * Returns an array of daily outbound totals of length `windowDays` (including 0 for days without movement).
 * `reference` is the last day of the window (default today).
 */
function getDailyOutboundSeries(
  transactions: InventoryTransaction[],
  sku: string,
  warehouseId: number,
  windowDays: number = TRAILING_WINDOW_DAYS,
  reference: string = todayISODate(),
): number[] {
  const dailyBuckets = new Map<string, number>();
  for (const t of transactions) {
    if (t.sku === sku && t.warehouseId === warehouseId && t.direction === "OUT" && isWithinTrailingWindow(t.date, windowDays, reference)) {
      dailyBuckets.set(t.date, (dailyBuckets.get(t.date) || 0) + t.quantity);
    }
  }

  const values: number[] = Array.from(dailyBuckets.values());
  while (values.length < windowDays) {
    values.push(0);
  }
  return values;
}

/**
 * Standard (raw) sample standard deviation of daily outbound demand (σ_daily).
 */
export function dailyDemandStandardDeviation(
  transactions: InventoryTransaction[],
  sku: string,
  warehouseId: number,
  windowDays: number = TRAILING_WINDOW_DAYS,
): number {
  const values = getDailyOutboundSeries(transactions, sku, warehouseId, windowDays);
  if (values.length <= 1) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / windowDays;
  let sumSquaredDiff = 0;
  for (const qty of values) {
    sumSquaredDiff += Math.pow(qty - mean, 2);
  }
  return Math.sqrt(sumSquaredDiff / (windowDays - 1));
}

/**
 * Days of history behind a position's demand figure: calendar days from its
 * first transaction (any direction) through `reference`, both inclusive,
 * capped at `windowDays` (a first transaction today = 1 day).
 * A product first seen 10 days ago has 10 days of history, not 90 — dividing
 * its sales by 90 would treat the days before it existed as zero sales and
 * understate demand. Same definition as the Inventory table's SQL
 * ("daysOfHistory" in data/repositories/inventory.ts), so both give one number.
 */
export function daysOfDemandHistory(
  transactions: InventoryTransaction[],
  sku: string,
  warehouseId: number,
  windowDays: number = TRAILING_WINDOW_DAYS,
  reference: string = todayISODate(),
): number {
  let first: string | null = null;
  for (const t of transactions) {
    if (t.sku !== sku || t.warehouseId !== warehouseId || t.date > reference) continue;
    if (first === null || t.date < first) first = t.date;
  }
  if (first === null) return windowDays;
  return Math.min(windowDays, daysBetween(first, reference) + 1);
}

/**
 * Outlier-resistant trimmed mean daily demand (drops top & bottom 5% of active sales days).
 * Protects against temporary promotional spikes or spot bulk orders distorting structural velocity.
 * Trimming is proportional to the number of active (non-zero) sales days so sparse/intermittent
 * demand does not have its real sales trimmed away.
 * The daily rate is per day of actual history (`daysOfDemandHistory`), not per
 * `windowDays`, so a new product's demand isn't diluted by days before it existed.
 * `reference` is the last day of the window (default today) — the spike check
 * uses an earlier reference so the week being tested isn't in its own baseline.
 */
export function trimmedDailyDemand(
  transactions: InventoryTransaction[],
  sku: string,
  warehouseId: number,
  windowDays: number = TRAILING_WINDOW_DAYS,
  trimPercent: number = 0.05,
  minActiveDaysToTrim: number = 20,
  reference: string = todayISODate(),
): number | null {
  const values = getDailyOutboundSeries(transactions, sku, warehouseId, windowDays, reference);
  const activeValues = values.filter((v) => v > 0);
  if (activeValues.length === 0) return null;

  const totalSum = activeValues.reduce((a, b) => a + b, 0);
  if (totalSum <= 0) return null;

  const historyDays = daysOfDemandHistory(transactions, sku, warehouseId, windowDays, reference);
  const activeDays = activeValues.length;
  if (activeDays < minActiveDaysToTrim) {
    // Sparse/intermittent demand: do not trim with small sample size
    return Math.round((totalSum / historyDays) * 100) / 100;
  }

  activeValues.sort((a, b) => a - b);
  const trimCount = Math.floor(activeDays * trimPercent);
  if (trimCount === 0) {
    return Math.round((totalSum / historyDays) * 100) / 100;
  }

  const trimmed = activeValues.slice(trimCount, activeValues.length - trimCount);
  if (trimmed.length === 0) {
    return Math.round((totalSum / historyDays) * 100) / 100;
  }

  const trimmedActiveMean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  const dailyDemand = (trimmedActiveMean * activeDays) / historyDays;
  return Math.round(dailyDemand * 100) / 100;
}

/**
 * Outlier-resistant sample standard deviation of daily outbound demand (winsorized σ).
 * Clips extreme outliers to the 5th and 95th percentiles before computing σ.
 * `reference` is the last day of the window (default today).
 */
export function winsorizedDailyDemandStandardDeviation(
  transactions: InventoryTransaction[],
  sku: string,
  warehouseId: number,
  windowDays: number = TRAILING_WINDOW_DAYS,
  trimPercent: number = 0.05,
  reference: string = todayISODate(),
): number {
  const values = getDailyOutboundSeries(transactions, sku, warehouseId, windowDays, reference);
  if (values.length <= 1) return 0;

  values.sort((a, b) => a - b);
  const trimCount = Math.floor(windowDays * trimPercent);
  const pLow = values[trimCount];
  const pHigh = values[values.length - 1 - trimCount];

  const winsorized = values.map((v) => Math.max(pLow, Math.min(pHigh, v)));
  const winMean = winsorized.reduce((a, b) => a + b, 0) / windowDays;

  let sumSquaredDiff = 0;
  for (const v of winsorized) {
    sumSquaredDiff += Math.pow(v - winMean, 2);
  }

  return Math.sqrt(sumSquaredDiff / (windowDays - 1));
}

/**
 * Calculates day-of-week demand multipliers (Sun=0 ... Sat=6) from trailing 90 days.
 * Credits lower demand on weekends to avoid artificially penalizing short-lead SKUs.
 */
export function calculateDayOfWeekMultipliers(
  transactions: InventoryTransaction[],
  sku: string,
  warehouseId: number,
  windowDays: number = TRAILING_WINDOW_DAYS,
): number[] {
  const dowTotals = new Array(7).fill(0);
  const dowCounts = new Array(7).fill(0);

  const today = todayISODate();
  for (let i = 0; i < windowDays; i++) {
    const d = addDays(today, -i);
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    dowCounts[dow]++;
  }

  for (const t of transactions) {
    if (t.sku === sku && t.warehouseId === warehouseId && t.direction === "OUT" && isWithinTrailingWindow(t.date, windowDays)) {
      const dow = new Date(`${t.date}T00:00:00Z`).getUTCDay();
      dowTotals[dow] += t.quantity;
    }
  }

  const totalOut = dowTotals.reduce((a, b) => a + b, 0);
  const overallDailyAvg = totalOut / windowDays;

  if (overallDailyAvg <= 0 || !Number.isFinite(overallDailyAvg)) {
    return [1, 1, 1, 1, 1, 1, 1];
  }

  const rawMultipliers = dowTotals.map((tot, idx) => {
    const count = dowCounts[idx] || 1;
    const dayAvg = tot / count;
    return dayAvg / overallDailyAvg;
  });

  const sumRaw = rawMultipliers.reduce((a, b) => a + b, 0);
  if (sumRaw <= 0 || !Number.isFinite(sumRaw)) return [1, 1, 1, 1, 1, 1, 1];

  // Normalize so the 7 multipliers sum to exactly 7.0 (average multiplier = 1.0)
  return rawMultipliers.map((m) => Math.round((m * 7.0 / sumRaw) * 1000) / 1000);
}

/** Returns null (not Infinity/0) when there is no outbound demand in the window. */
export function averageDailyDemand(
  trailingOutbound: number,
  windowDays: number = TRAILING_WINDOW_DAYS,
): number | null {
  if (trailingOutbound <= 0) return null;
  return trailingOutbound / windowDays;
}

export function daysOfStock(availableQuantity: number, avgDailyDemand: number | null): number | null {
  if (avgDailyDemand === null || avgDailyDemand === 0) return null;
  return availableQuantity / avgDailyDemand;
}

/** Safety lead time = 50% of the supplier's standard replenishment lead time. */
export function safetyLeadTimeDays(supplierLeadTimeDays: number): number {
  return supplierLeadTimeDays * 0.5;
}

/**
 * Variability-based safety stock: safety_stock = z × σ_daily × sqrt(lead_time_days).
 */
export function variabilitySafetyStock(
  sigmaDaily: number,
  supplierLeadTimeDays: number,
  z: number = DEFAULT_SERVICE_LEVEL_Z,
): number {
  if (sigmaDaily <= 0 || supplierLeadTimeDays <= 0) return 0;
  return Math.round(z * sigmaDaily * Math.sqrt(supplierLeadTimeDays) * 100) / 100;
}

export function safetyStock(avgDailyDemand: number | null, supplierLeadTimeDays: number): number {
  return (avgDailyDemand ?? 0) * safetyLeadTimeDays(supplierLeadTimeDays);
}

/** Demand expected during the replenishment lead time (+ review period), plus variability safety buffer. */
export function reorderPoint(
  avgDailyDemand: number | null,
  supplierLeadTimeDays: number,
  sigmaDaily?: number,
): number {
  const demand = avgDailyDemand ?? 0;
  const ss =
    sigmaDaily !== undefined && sigmaDaily > 0
      ? variabilitySafetyStock(sigmaDaily, supplierLeadTimeDays)
      : safetyStock(avgDailyDemand, supplierLeadTimeDays);
  return demand * (supplierLeadTimeDays + REVIEW_PERIOD_DAYS) + ss;
}

/** Multiplier above target stock to qualify as overstock (default: 3.0x target stock) */
export const OVERSTOCK_MULTIPLE = 3.0;

/**
 * Lead-time proportional overstock threshold:
 * target_stock = (lead_time_days + REVIEW_PERIOD_DAYS) × daily_demand + safety_stock
 * overstock_threshold = target_stock × OVERSTOCK_MULTIPLE
 */
export function overstockThreshold(
  avgDailyDemand: number | null,
  supplierLeadTimeDays: number,
  sigmaDaily?: number,
  multiple: number = OVERSTOCK_MULTIPLE,
): number {
  const demand = avgDailyDemand ?? 0;
  const ss =
    sigmaDaily !== undefined && sigmaDaily > 0
      ? variabilitySafetyStock(sigmaDaily, supplierLeadTimeDays)
      : safetyStock(avgDailyDemand, supplierLeadTimeDays);
  const targetStock = demand * (supplierLeadTimeDays + REVIEW_PERIOD_DAYS) + ss;
  return Math.round(targetStock * multiple * 10) / 10;
}

export function isHealthy(
  availableQuantity: number,
  safetyStockValue: number,
  overstockThresholdValue: number,
): boolean {
  return availableQuantity >= safetyStockValue && availableQuantity <= overstockThresholdValue;
}

interface ClassifyParams {
  availableQuantity: number;
  avgDailyDemand: number | null;
  daysOfStockValue: number | null;
  safetyStockValue: number;
  overstockThresholdValue: number;
}

/**
 * Most-severe-wins classification. Order matters: a SKU that is both
 * critically low AND has stale demand is reported as stock-out risk, since
 * that is the more urgent action.
 */
export function classifyInventoryStatus(params: ClassifyParams): InventoryStatus {
  const { availableQuantity, avgDailyDemand, daysOfStockValue, safetyStockValue, overstockThresholdValue } = params;

  if (availableQuantity <= 0 || (daysOfStockValue !== null && daysOfStockValue <= STOCK_OUT_RISK_DAYS)) {
    return "stock_out_risk";
  }
  if (avgDailyDemand === null) {
    return "dead_stock";
  }
  if (daysOfStockValue !== null && daysOfStockValue > SLOW_MOVING_DAYS) {
    return "slow_moving";
  }
  if (availableQuantity < safetyStockValue) {
    return "low_stock";
  }
  if (availableQuantity > overstockThresholdValue) {
    return "overstock";
  }
  return "healthy";
}

export function buildInventoryInsight(
  transactions: InventoryTransaction[],
  record: { sku: string; warehouseId: number; quantityOnHand: number },
  supplierLeadTimeDays: number,
  windowDays: number = TRAILING_WINDOW_DAYS,
): InventoryInsight {
  const trailing = trailingOutboundQuantity(transactions, record.sku, record.warehouseId, windowDays);
  const rawAvgDemand = averageDailyDemand(trailing, windowDays);

  // Outlier-resistant velocity and winsorized sigma (V3)
  const robustDemand = trimmedDailyDemand(transactions, record.sku, record.warehouseId, windowDays) ?? rawAvgDemand;
  const robustSigma = winsorizedDailyDemandStandardDeviation(transactions, record.sku, record.warehouseId, windowDays);

  const avgDemand = robustDemand;
  const dos = daysOfStock(record.quantityOnHand, avgDemand);

  const ss = robustSigma > 0
    ? variabilitySafetyStock(robustSigma, supplierLeadTimeDays)
    : safetyStock(avgDemand, supplierLeadTimeDays);

  const rp = reorderPoint(avgDemand, supplierLeadTimeDays, robustSigma);
  const ot = overstockThreshold(avgDemand, supplierLeadTimeDays, robustSigma);

  return {
    sku: record.sku,
    warehouseId: record.warehouseId,
    availableQuantity: record.quantityOnHand,
    averageDailyDemand: avgDemand !== null ? Math.round(avgDemand * 100) / 100 : null,
    daysOfStock: dos !== null ? Math.round(dos * 10) / 10 : null,
    safetyStock: Math.round(ss * 10) / 10,
    reorderPoint: Math.round(rp * 10) / 10,
    overstockThreshold: Math.round(ot * 10) / 10,
    status: classifyInventoryStatus({
      availableQuantity: record.quantityOnHand,
      avgDailyDemand: avgDemand,
      daysOfStockValue: dos,
      safetyStockValue: ss,
      overstockThresholdValue: ot,
    }),
  };
}

/** Composite 0-100 inventory health score across all insight rows. */
export function inventoryHealthScore(insights: InventoryInsight[]): number {
  if (insights.length === 0) return 100;

  const weights: Record<InventoryStatus, number> = {
    healthy: 100,
    low_stock: 60,
    overstock: 75,
    slow_moving: 70,
    dead_stock: 40,
    stock_out_risk: 10,
  };

  const total = insights.reduce((sum, row) => sum + weights[row.status], 0);
  return Math.round(total / insights.length);
}
