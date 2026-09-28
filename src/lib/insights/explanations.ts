/**
 * "Why this number" explanations. Pure text built only from values the app
 * already computes — no new calculations. Wherever an input is assumed or
 * thin (a defaulted lead time, a short sales history), the text says so
 * instead of presenting the number as confidently reasoned.
 */
import type { ReorderBreakdown } from "@/types/supply-chain";

export interface Explanation {
  headline: string;
  lines: string[];
  /** An honest caveat (early estimate, assumed input). */
  warning?: string;
  /** Small-print definition. */
  note?: string;
}

const WINDOW_DAYS = 90;

function units(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
/** Whole numbers from 100 up, one decimal below (drops a trailing .0). */
function amount(n: number): string {
  return Math.abs(n) >= 100 ? units(n) : String(Math.round(n * 10) / 10);
}
function days(n: number): string {
  return `${n} day${n === 1 ? "" : "s"}`;
}
function money(n: number): string {
  return `$${units(n)}`;
}
function list(items: string[]): string {
  return items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// ---------------------------------------------------------------------------
// 1. Days until stockout
// ---------------------------------------------------------------------------

export interface DaysOfStockInput {
  onHand: number;
  /** Units/day, as shown elsewhere; null or 0 = no sales in the window. */
  dailyDemand: number | null;
  daysOfStock: number | null;
  /** Days of history behind the rate (1–90). */
  historyDays: number;
  /** Days with at least one sale in the window. */
  activeDays: number;
  /** Units sold in the window. */
  totalSold: number;
}

/** Selling days needed before the busiest/quietest 5% are trimmed (matches trimmedDailyDemand). */
const MIN_ACTIVE_DAYS_TO_TRIM = 20;

export function explainDaysOfStock(i: DaysOfStockInput): Explanation {
  if (i.onHand <= 0) return { headline: "Out of stock", lines: ["Out of stock — 0 on hand."] };
  if (i.dailyDemand === null || i.dailyDemand <= 0 || i.daysOfStock === null) {
    return { headline: "No sales", lines: ["No sales in the last 90 days, so there's nothing to count down — this stock isn't being used."] };
  }

  const headline = `${formatDaysOfStock(i.daysOfStock)} until stockout`;
  const ratio = `${units(i.onHand)} on hand ÷ ${i.dailyDemand} sold per day`;
  const trimmed = i.activeDays >= MIN_ACTIVE_DAYS_TO_TRIM;

  if (i.historyDays < WINDOW_DAYS) {
    const math = trimmed ? "" : ` (${units(i.totalSold)} units ÷ ${days(i.historyDays)})`;
    return {
      headline,
      lines: [ratio],
      warning: `Early estimate: based on only ${days(i.historyDays)} of history and ${days(i.activeDays)} with sales${math}. This will change as more sales come in.`,
    };
  }

  return {
    headline,
    lines: [
      ratio,
      trimmed
        ? "Daily rate: the last 90 days of sales, leaving out the busiest and quietest 5% of selling days so one-off spikes don't skew it."
        : `Daily rate: ${units(i.totalSold)} units sold over the last 90 days ÷ 90 days.`,
      "Stock on order isn't counted here — see Projections for arrivals.",
    ],
  };
}

/** One decimal, matching the Inventory table ("17.5 days"). */
export function formatDaysOfStock(daysOfStock: number): string {
  const d = Math.round(daysOfStock * 10) / 10;
  return `${d.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${d === 1 ? "day" : "days"}`;
}

// ---------------------------------------------------------------------------
// 2. Suggested reorder quantity (the forecast engine's number)
// ---------------------------------------------------------------------------

export function explainReorderQuantity(b: ReorderBreakdown): Explanation {
  const coverDays = b.leadTimeDays + b.reviewDays;
  const leadDemand = b.dailyDemand * coverDays;
  const inboundTotal = b.inbound.reduce((s, p) => s + p.quantity, 0);

  const safety =
    b.sigma > 0
      ? `· Safety buffer: ${amount(b.safetyStock)} — covers day-to-day swings of ±${b.sigma}/day over the ${b.leadTimeDays}-day lead time (95% service level)`
      : `· Safety buffer: ${amount(b.safetyStock)} — ${
          b.activeDays <= 1 ? `only ${days(b.activeDays)} with sales, so day-to-day swings can't be measured yet` : "no day-to-day variation measured"
        }; using half of lead-time demand instead (${b.dailyDemand} × ${b.leadTimeDays} × 0.5)`;

  const onOrderParts: string[] = [];
  if (b.inbound.length) onOrderParts.push(list(b.inbound.map((p) => `${p.poNumber} · ${units(p.quantity)} units arriving ${p.arrives}`)));
  if (b.overdue.length) {
    const overdue = list(b.overdue.map((p) => `${p.poNumber} · ${units(p.quantity)} units`));
    onOrderParts.push(`${overdue} ${b.overdue.length === 1 ? "is" : "are"} overdue, so ${b.overdue.length === 1 ? "it's" : "they're"} not counted`);
  }

  const warnings: string[] = [];
  if (b.leadTimeMissing) {
    warnings.push(`Lead time assumed ${b.leadTimeDays} days — none on file for ${b.supplierName}. Add the real lead time to get an accurate quantity.`);
  }
  if (b.historyDays < WINDOW_DAYS) warnings.push(`Early estimate: the daily rate is based on only ${days(b.historyDays)} of history.`);

  return {
    headline: `How we got ${units(b.quantity)} ${b.quantity === 1 ? "unit" : "units"}`,
    lines: [
      `Target stock to hold: ${units(b.targetStock)}`,
      `· Lead-time demand: ${b.dailyDemand}/day × ${coverDays} days (${b.leadTimeDays}-day supplier lead time + ${days(b.reviewDays)} to the next review) = ${amount(leadDemand)}`,
      safety,
      `− On hand: ${units(b.onHand)}`,
      `− On order, arriving in time: ${units(inboundTotal)}${onOrderParts.length ? ` (${onOrderParts.join("; ")})` : ""}`,
      `= Order ${units(b.quantity)}`,
    ],
    warning: warnings.length ? warnings.join(" ") : undefined,
  };
}

// ---------------------------------------------------------------------------
// 3. Supplier score
// ---------------------------------------------------------------------------

export interface SupplierScoreInput {
  score: number | null;
  suppliers: { name: string; otifPercent: number | null; onTimeInFullCount: number; eligiblePurchaseOrders: number; totalSpend: number }[];
}

export function explainSupplierScore({ score, suppliers }: SupplierScoreInput): Explanation {
  if (score === null) {
    return {
      headline: "No data",
      lines: ["No data — no purchase orders were received or overdue in the last 90 days, so there's nothing to score yet."],
    };
  }
  const scored = suppliers.filter((s) => s.otifPercent !== null && s.totalSpend > 0);
  const notScored = suppliers.filter((s) => s.otifPercent === null);
  const spend = scored.reduce((sum, s) => sum + s.totalSpend, 0);
  // The supplier pulling the spend-weighted score down the most.
  const drag = [...scored].sort((a, b) => b.totalSpend * (100 - (b.otifPercent as number)) - a.totalSpend * (100 - (a.otifPercent as number)))[0];

  const lines = [
    `${score} / 100 — on-time-in-full rate across ${scored.length} supplier${scored.length === 1 ? "" : "s"}, weighted by what you spent with each in the last 90 days (${money(spend)}).`,
  ];
  if (drag && (drag.otifPercent as number) < 100) {
    lines.push(
      `Biggest drag: ${drag.name} — ${drag.onTimeInFullCount} of ${drag.eligiblePurchaseOrders} POs on time (${drag.otifPercent}%) on ${money(drag.totalSpend)} of spend.`,
    );
  }
  if (notScored.length) {
    lines.push(`Not scored: ${list(notScored.map((s) => s.name))} — no received or overdue POs in 90 days.`);
  }
  return {
    headline: `${score} / 100`,
    lines,
    note: "On time = received on or before the expected date; open POs past their expected date count as late. Partial deliveries aren't recorded, so every received PO counts as in full.",
  };
}

/** Plain-text form for places that only take a string (e.g. a tooltip). */
export function explanationText(e: Explanation): string {
  return [...e.lines, e.warning, e.note].filter(Boolean).join("\n");
}
