/**
 * Free inventory health check (public /health-check page). Runs entirely in
 * the visitor's browser: the uploaded file is parsed and scored here and is
 * never sent to the server, so there is nothing to persist or delete.
 *
 * Reuses the importer's parsing/cleaning and the app's inventory metrics
 * as-is — this module only adapts a one-off upload into the shapes those
 * functions already take. Do not fork the math here; if a definition
 * changes, it changes in src/lib/metrics/inventory.ts for both.
 */
import type { InventoryTransaction } from "@/types/supply-chain";
import type { RawParsedSheet } from "@/lib/importer/types";
import { readWorkbookBuffer } from "@/lib/importer/reader";
import { cleanDateValue, cleanNumericValue, cleanString, detectColumnDateFormat } from "@/lib/importer/cleaner";
import { SYNONYM_DICTIONARY, normalizeHeaderString } from "@/lib/importer/mapping";
import {
  buildInventoryInsight,
  classifyInventoryStatus,
  daysOfStock,
  overstockThreshold,
  reorderPoint,
  safetyStock,
  variabilitySafetyStock,
} from "@/lib/metrics/inventory";
import { addDays, daysBetween, toISODate, todayISODate } from "@/lib/dates";
import { STOCKOUT_HORIZON_DAYS, type DemandSource, type HealthCheckResult, type SkuResult } from "./report";

/** Same fallback the dashboard uses when a supplier has no lead time. */
export const DEFAULT_LEAD_TIME_DAYS = 14;
/** Matches the metrics layer's 90-day trailing demand window. */
const HISTORY_WINDOW_DAYS = 90;
const WEEKLY_WINDOW_WEEKS = 13;

type Field = "sku" | "onHand" | "unitCost" | "avgDailyDemand" | "leadTime" | "date" | "qtySold";

const FIELD_SYNONYMS: Record<Field, string[]> = {
  sku: SYNONYM_DICTIONARY.sku,
  onHand: [...SYNONYM_DICTIONARY.quantity_on_hand, "on hand qty", "on hand quantity", "on hand"],
  unitCost: SYNONYM_DICTIONARY.unit_cost,
  leadTime: [...SYNONYM_DICTIONARY.supplier_lead_time, "lead time days"],
  avgDailyDemand: [
    "avg daily demand", "average daily demand", "daily demand", "avg daily sales", "average daily sales",
    "ads", "avg demand per day", "daily usage", "avg daily usage",
  ],
  date: ["date", "sales date", "day", "week", "week start", "week of", "week ending", "period", "transaction date"],
  qtySold: ["qty sold", "quantity sold", "units sold", "sales qty", "sales quantity", "sold", "sales", "demand", "qty"],
};

export class HealthCheckInputError extends Error {}

function mapHeaders(headers: string[]): Partial<Record<Field, number>> {
  const normalized = headers.map((h) => normalizeHeaderString(h));
  const out: Partial<Record<Field, number>> = {};
  const taken = new Set<number>();
  // Most specific fields first so e.g. "qty sold" isn't claimed as on-hand.
  const order: Field[] = ["sku", "avgDailyDemand", "qtySold", "onHand", "unitCost", "leadTime", "date"];
  for (const field of order) {
    const syns = FIELD_SYNONYMS[field].map(normalizeHeaderString);
    const idx = normalized.findIndex((h, i) => !taken.has(i) && syns.includes(h));
    if (idx !== -1) {
      out[field] = idx;
      taken.add(idx);
    }
  }
  return out;
}

interface SkuAccumulator {
  onHand: number | null;
  unitCost: number | null;
  leadTime: number | null;
  avgDailyDemand: number | null;
  history: Map<string, number>; // ISO date -> qty sold
}

function lastNonNull(current: number | null, next: number | null): number | null {
  return next === null ? current : next;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function pickSheet(sheets: RawParsedSheet[]): { sheet: RawParsedSheet; cols: Partial<Record<Field, number>> } {
  for (const sheet of sheets) {
    const cols = mapHeaders(sheet.headers);
    if (cols.sku !== undefined) return { sheet, cols };
  }
  throw new HealthCheckInputError(
    "Couldn't find a SKU column. Use the sample template, or name your columns sku, on_hand_qty, unit_cost, and avg_daily_demand (or date + qty_sold).",
  );
}

/** Scores one SKU from an average daily demand (+ optional daily σ), mirroring buildInventoryInsight's tail. */
function scoreFromDemand(onHand: number, avg: number | null, sigmaDaily: number | undefined, leadTime: number) {
  const dos = daysOfStock(onHand, avg);
  const ss = sigmaDaily !== undefined && sigmaDaily > 0 ? variabilitySafetyStock(sigmaDaily, leadTime) : safetyStock(avg, leadTime);
  const ot = overstockThreshold(avg, leadTime, sigmaDaily);
  const rp = reorderPoint(avg, leadTime, sigmaDaily);
  const status = classifyInventoryStatus({
    availableQuantity: onHand,
    avgDailyDemand: avg,
    daysOfStockValue: dos,
    safetyStockValue: ss,
    overstockThresholdValue: ot,
  });
  return { avg, dos, ot, rp, status };
}

export function analyzeHealthCheckBuffer(buffer: ArrayBuffer | Uint8Array): HealthCheckResult {
  const sheets = readWorkbookBuffer(buffer);
  if (sheets.length === 0) throw new HealthCheckInputError("That file looks empty.");
  const { sheet, cols } = pickSheet(sheets);
  const warnings: string[] = [];

  const hasAverage = cols.avgDailyDemand !== undefined;
  const hasHistory = cols.date !== undefined && cols.qtySold !== undefined;
  if (cols.onHand === undefined) throw new HealthCheckInputError("Couldn't find an on-hand quantity column (e.g. on_hand_qty).");
  if (!hasAverage && !hasHistory) {
    throw new HealthCheckInputError(
      "Add either an avg_daily_demand column, or sales history as date + qty_sold columns (one row per SKU per day or week).",
    );
  }
  if (cols.unitCost === undefined) warnings.push("No unit cost column found — excess inventory is shown as $0.");

  const cell = (row: RawParsedSheet["rawRows"][number], field: Field) =>
    cols[field] === undefined ? null : row[cols[field] as number];

  let datePref: "DD/MM" | "MM/DD" = "MM/DD"; // US default when a column is ambiguous
  if (hasHistory) {
    const detected = detectColumnDateFormat(sheet.rawRows.map((r) => cell(r, "date")));
    if (detected !== "AMBIGUOUS") datePref = detected;
  }

  const bySku = new Map<string, SkuAccumulator>();
  let unparsableDates = 0;
  for (const row of sheet.rawRows) {
    const sku = cleanString(cell(row, "sku"));
    if (!sku) continue;
    const acc =
      bySku.get(sku) ??
      { onHand: null, unitCost: null, leadTime: null, avgDailyDemand: null, history: new Map<string, number>() };
    acc.onHand = lastNonNull(acc.onHand, cleanNumericValue(cell(row, "onHand")));
    acc.unitCost = lastNonNull(acc.unitCost, cleanNumericValue(cell(row, "unitCost")));
    acc.leadTime = lastNonNull(acc.leadTime, cleanNumericValue(cell(row, "leadTime")));
    acc.avgDailyDemand = lastNonNull(acc.avgDailyDemand, cleanNumericValue(cell(row, "avgDailyDemand")));
    if (hasHistory) {
      const rawDate = cell(row, "date");
      const qty = cleanNumericValue(cell(row, "qtySold"));
      if (rawDate !== null && qty !== null) {
        const d = cleanDateValue(rawDate, datePref);
        if (d) {
          const iso = toISODate(d);
          acc.history.set(iso, (acc.history.get(iso) ?? 0) + Math.max(0, qty));
        } else {
          unparsableDates++;
        }
      }
    }
    bySku.set(sku, acc);
  }
  if (bySku.size === 0) throw new HealthCheckInputError("No SKU rows found in the file.");
  if (unparsableDates > 0) warnings.push(`${unparsableDates.toLocaleString()} sales row(s) had a date we couldn't read and were skipped.`);

  // History granularity + anchoring. Uploaded history can end any day, but
  // the metrics layer measures trailing windows back from today — so shift
  // the whole file so its most recent sales date lands on today.
  const allDates = [...new Set([...bySku.values()].flatMap((a) => [...a.history.keys()]))].sort();
  let historyMode: "daily" | "weekly" | null = null;
  let shiftDays = 0;
  let weekStarts: string[] = [];
  if (allDates.length > 0) {
    const gaps = allDates.slice(1).map((d, i) => daysBetween(allDates[i], d));
    historyMode = gaps.length > 0 && median(gaps) >= 5 ? "weekly" : "daily";
    shiftDays = daysBetween(allDates[allDates.length - 1], todayISODate());
    weekStarts = allDates.slice(-WEEKLY_WINDOW_WEEKS);
  }

  let defaultedLeadTimes = 0;
  let missingOnHand = 0;
  const sourceCounts: Record<DemandSource, number> = { daily_history: 0, weekly_history: 0, average: 0 };
  const rows: SkuResult[] = [];

  for (const [sku, acc] of bySku) {
    if (acc.onHand === null) {
      missingOnHand++;
      continue;
    }
    const onHand = acc.onHand;
    const leadTimeDefaulted = acc.leadTime === null || acc.leadTime <= 0;
    const leadTime = leadTimeDefaulted ? DEFAULT_LEAD_TIME_DAYS : (acc.leadTime as number);
    if (leadTimeDefaulted) defaultedLeadTimes++;

    let scored: ReturnType<typeof scoreFromDemand>;
    let demandSource: DemandSource;

    if (acc.avgDailyDemand !== null) {
      demandSource = "average";
      const avg = acc.avgDailyDemand > 0 ? acc.avgDailyDemand : null;
      scored = scoreFromDemand(onHand, avg, undefined, leadTime);
    } else if (historyMode === "daily") {
      demandSource = "daily_history";
      const transactions: InventoryTransaction[] = [...acc.history].map(([date, quantity], i) => ({
        id: i,
        sku,
        warehouseId: 0,
        quantity,
        direction: "OUT",
        date: addDays(date, shiftDays),
      }));
      const insight = buildInventoryInsight(transactions, { sku, warehouseId: 0, quantityOnHand: onHand }, leadTime, HISTORY_WINDOW_DAYS);
      scored = {
        avg: insight.averageDailyDemand,
        dos: insight.daysOfStock,
        ot: insight.overstockThreshold,
        rp: insight.reorderPoint,
        status: insight.status,
      };
    } else if (historyMode === "weekly") {
      demandSource = "weekly_history";
      // Weeks with no row for this SKU count as zero sales.
      const weekly = weekStarts.map((w) => acc.history.get(w) ?? 0);
      const total = weekly.reduce((a, b) => a + b, 0);
      const avg = total > 0 ? total / (weekly.length * 7) : null;
      const meanWeekly = total / weekly.length;
      const sigmaWeekly =
        weekly.length > 1 ? Math.sqrt(weekly.reduce((s, q) => s + (q - meanWeekly) ** 2, 0) / (weekly.length - 1)) : 0;
      // Weekly σ → daily σ assuming independent days (σ_d = σ_w / √7).
      scored = scoreFromDemand(onHand, avg, sigmaWeekly / Math.sqrt(7), leadTime);
    } else {
      // No average given and no sales rows at all for this SKU in a history file.
      demandSource = "daily_history";
      scored = scoreFromDemand(onHand, null, undefined, leadTime);
    }
    sourceCounts[demandSource]++;

    const excessUnits = Math.max(0, onHand - scored.ot);
    const unitCost = acc.unitCost;
    const hasDemand = scored.avg !== null && scored.avg > 0;
    rows.push({
      sku,
      onHand,
      unitCost,
      leadTimeDays: leadTime,
      leadTimeDefaulted,
      avgDailyDemand: scored.avg !== null ? round(scored.avg, 2) : null,
      daysOfCover: scored.dos !== null ? round(scored.dos, 1) : null,
      reorderPoint: round(scored.rp, 1),
      overstockThreshold: round(scored.ot, 1),
      excessUnits: round(excessUnits, 1),
      excessValue: round(excessUnits * (unitCost ?? 0), 2),
      status: scored.status,
      // Will run out within the horizon at current demand (or already has, while still selling).
      stockoutRisk: hasDemand && (onHand <= 0 || (scored.dos !== null && scored.dos <= STOCKOUT_HORIZON_DAYS)),
      demandSource,
    });
  }

  if (rows.length === 0) throw new HealthCheckInputError("None of the SKUs had an on-hand quantity.");
  if (missingOnHand > 0) warnings.push(`${missingOnHand.toLocaleString()} SKU(s) had no on-hand quantity and were skipped.`);
  if (defaultedLeadTimes > 0) {
    warnings.push(`${defaultedLeadTimes.toLocaleString()} SKU(s) had no lead time — assumed ${DEFAULT_LEAD_TIME_DAYS} days.`);
  }

  const atRisk = rows.filter((r) => r.stockoutRisk);
  const topRisk = [...atRisk]
    .sort((a, b) => (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0) || dailyValue(b) - dailyValue(a))
    .slice(0, 5);
  const topExcess = rows.filter((r) => r.excessValue > 0).sort((a, b) => b.excessValue - a.excessValue).slice(0, 5);
  const demandSource = (Object.keys(sourceCounts) as DemandSource[]).reduce((a, b) => (sourceCounts[b] > sourceCounts[a] ? b : a));

  return {
    skuCount: rows.length,
    stockoutRiskCount: atRisk.length,
    excessValue: round(rows.reduce((s, r) => s + r.excessValue, 0), 2),
    topRisk,
    topExcess,
    rows,
    demandSource,
    warnings,
  };
}

/** Daily sales value at cost — tie-breaker so the costlier stockout ranks first. */
function dailyValue(r: SkuResult): number {
  return (r.avgDailyDemand ?? 0) * (r.unitCost ?? 0);
}

