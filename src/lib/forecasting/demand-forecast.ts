import type {
  InventoryInsight,
  InventoryRecord,
  InventoryTransaction,
  Product,
  PurchaseOrder,
  Supplier,
  Warehouse,
} from "@/types/supply-chain";
import { daysBetween, isWithinTrailingWindow, todayISODate } from "@/lib/dates";
import {
  DEFAULT_SERVICE_LEVEL_Z,
  REVIEW_PERIOD_DAYS,
  averageDailyDemand,
  calculateDayOfWeekMultipliers,
  trimmedDailyDemand,
  variabilitySafetyStock,
  winsorizedDailyDemandStandardDeviation,
} from "@/lib/metrics/inventory";
import { isPoOverdue } from "@/lib/insights/inventory-availability";

export interface DemandProjection {
  sku: string;
  warehouseId: number;
  dailyDemandPace: number;
  dailyDemandSigma: number;
  safetyStock: number;
  projected30DayDemand: number;
  projected60DayDemand: number;
  trendDirection: "accelerating" | "stable" | "decelerating";
  trendMultiplier: number;
}

export type SuggestedOrderActionType = "reorder" | "expedite" | "transfer";

export interface SuggestedPurchaseOrder {
  id: string;
  sku: string;
  productName: string;
  category: string;
  supplierId: string;
  supplierName: string;
  supplierLeadTimeDays: number;
  warehouseId: number;
  warehouseCode: string;
  currentOnHand: number;
  targetStock: number;
  reorderPoint: number;
  dailyDemand: number;
  rawDailyDemand?: number;
  dailyDemandSigma: number;
  safetyStock: number;
  inboundQuantity: number;
  inboundPoDetails?: string;
  suggestedQuantity: number;
  actionType: SuggestedOrderActionType;
  unitPrice: number;
  estimatedCost: number;
  daysOfCoverCurrent: number | null;
  daysOfCoverProjected: number;
  reasoning: string;
  firstStockoutDate?: string | null;
  coveredThroughDate?: string | null;
  gapDays?: number;
  gapInboundPoNumber?: string;
  surplusWarehouseCode?: string;
  surplusAvailableUnits?: number;
}

/** Helper: formats ISO date string YYYY-MM-DD + N days */
function addDaysISO(baseDateStr: string, days: number): string {
  const d = new Date(baseDateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministic mathematical demand forecast with outlier-resistant demand and variability (σ).
 */
export function calculateDemandProjection(
  transactions: InventoryTransaction[],
  sku: string,
  warehouseId: number,
  supplierLeadTimeDays: number = 14,
): DemandProjection {
  const outbound30 = transactions.reduce((sum, t) => {
    if (t.sku === sku && t.warehouseId === warehouseId && t.direction === "OUT" && isWithinTrailingWindow(t.date, 30)) {
      return sum + t.quantity;
    }
    return sum;
  }, 0);

  const outbound90 = transactions.reduce((sum, t) => {
    if (t.sku === sku && t.warehouseId === warehouseId && t.direction === "OUT" && isWithinTrailingWindow(t.date, 90)) {
      return sum + t.quantity;
    }
    return sum;
  }, 0);

  const daily30 = outbound30 / 30;
  const daily90 = outbound90 / 90;

  const pace = daily90 > 0 ? daily30 * 0.6 + daily90 * 0.4 : daily30;
  const dailyDemandPace = Math.round(pace * 100) / 100;

  const sigma = winsorizedDailyDemandStandardDeviation(transactions, sku, warehouseId, 90);
  const dailyDemandSigma = Math.round(sigma * 100) / 100;
  const ss = variabilitySafetyStock(dailyDemandSigma, supplierLeadTimeDays, DEFAULT_SERVICE_LEVEL_Z);

  let trendDirection: DemandProjection["trendDirection"] = "stable";
  let trendMultiplier = 1.0;

  if (daily90 > 0) {
    const ratio = daily30 / daily90;
    if (ratio >= 1.15) {
      trendDirection = "accelerating";
      trendMultiplier = Math.min(1.4, Math.round(ratio * 100) / 100);
    } else if (ratio <= 0.85) {
      trendDirection = "decelerating";
      trendMultiplier = Math.max(0.6, Math.round(ratio * 100) / 100);
    }
  }

  return {
    sku,
    warehouseId,
    dailyDemandPace,
    dailyDemandSigma,
    safetyStock: Math.round(ss * 10) / 10,
    projected30DayDemand: Math.round(dailyDemandPace * 30 * trendMultiplier),
    projected60DayDemand: Math.round(dailyDemandPace * 60 * trendMultiplier),
    trendDirection,
    trendMultiplier,
  };
}

/**
 * Normalized internal representation of an open PO. Overdue POs (expected date
 * passed, nothing received) are excluded from available/pipeline inventory —
 * their quantity never counts toward cover-days or reorder math (see
 * `@/lib/insights/inventory-availability`, the same overdue check the alert
 * engine uses) — but they still carry `effectiveArrivalDate` (their original
 * expected date) so they remain visible, clearly marked, wherever open POs
 * are listed.
 */
interface ProcessedOpenPo {
  rawPo: PurchaseOrder;
  effectiveArrivalDate: string;
  isOverdue: boolean;
  daysOverdue: number;
  overdueNote?: string;
}

/** A single inbound PO landing on a projection day — the sawtooth's "step up". */
export interface ProjectionArrival {
  poNumber: string;
  quantity: number;
  isOverdue: boolean;
  daysOverdue: number;
  /** The date the PO is now projected to land — overdue POs are rescheduled here, not at day 0. */
  effectiveArrivalDate: string;
  /** The date the PO was originally due — always shown alongside the revised ETA for an overdue PO. */
  originalExpectedDate: string;
}

/** One day of the forward simulation — the raw material for the sawtooth chart. */
export interface ProjectionDayPoint {
  day: number;
  date: string;
  openingBalance: number;
  closingBalance: number;
  demand: number;
  arrivals: ProjectionArrival[];
}

/**
 * The complete time-phased projection for one SKU at one warehouse — the single
 * source of truth consumed by both the suggested-PO/alert engine and the
 * sawtooth projection chart, so the two can never disagree.
 */
export interface SkuWarehouseProjection {
  sku: string;
  warehouseId: number;
  warehouseCode: string;
  productName: string;
  category: string;
  supplierId: string;
  supplierName: string;
  supplierLeadTimeDays: number;
  unitPrice: number;
  currentOnHand: number;
  dailyDemand: number;
  rawDailyDemand: number;
  dailyDemandSigma: number;
  safetyStock: number;
  reorderPoint: number;
  targetStock: number;
  targetCoverDays: number;
  daysOfCoverCurrent: number | null;
  daysOfCoverProjected: number;
  horizonDays: number;
  today: string;
  series: ProjectionDayPoint[];
  inboundPos: ProjectionArrival[];
  /** Unsorted, mirrors the raw open-PO list order (used for legacy reasoning text). */
  allOpenPos: ProjectionArrival[];
  inboundDetailsList: string[];
  totalInboundInHorizon: number;
  gapInboundPoNumber?: string;
  gapArrival?: ProjectionArrival;
  gapDays?: number;
  firstStockoutDate?: string | null;
  coveredThroughDate?: string | null;
  surplusWarehouseCode?: string;
  surplusAvailableUnits?: number;
  actionType?: SuggestedOrderActionType;
  suggestedQuantity: number;
}

/**
 * Runs the day-by-day forward simulation (V5 weekend-adjusted) and returns both
 * the final ending balance and the full per-day series behind it. Extracted so
 * the sawtooth chart renders the exact same walk the suggestion engine uses to
 * decide gaps and reorder points — never a separately recomputed line.
 */
function simulateForwardProjection({
  startingOnHand,
  dailyDemand,
  dowMultipliers,
  openPOs,
  horizonDays,
  today,
}: {
  startingOnHand: number;
  dailyDemand: number;
  dowMultipliers: Record<number, number>;
  openPOs: ProcessedOpenPo[];
  horizonDays: number;
  today: string;
}): { finalBalance: number; series: ProjectionDayPoint[] } {
  let running = startingOnHand;
  const series: ProjectionDayPoint[] = [];

  for (let d = 1; d <= horizonDays; d++) {
    const currentDate = addDaysISO(today, d);
    const currentDow = new Date(currentDate + "T00:00:00Z").getUTCDay();
    const dayDemand = dailyDemand * (dowMultipliers[currentDow] ?? 1.0);
    const openingBalance = running;

    const arriving = openPOs.filter((p) => p.effectiveArrivalDate === currentDate);
    for (const p of arriving) running += p.rawPo.quantity;
    running -= dayDemand;

    series.push({
      day: d,
      date: currentDate,
      openingBalance,
      closingBalance: running,
      demand: dayDemand,
      arrivals: arriving.map((p) => ({
        poNumber: p.rawPo.poNumber,
        quantity: p.rawPo.quantity,
        isOverdue: p.isOverdue,
        daysOverdue: p.daysOverdue,
        effectiveArrivalDate: p.effectiveArrivalDate,
        originalExpectedDate: p.rawPo.expectedDate,
      })),
    });
  }

  return { finalBalance: running, series };
}

interface ProjectionInputs {
  insights: InventoryInsight[];
  records: InventoryRecord[];
  products: Product[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  purchaseOrders?: PurchaseOrder[];
  transactions?: InventoryTransaction[];
}

interface ProjectionContext {
  today: string;
  productMap: Map<string, Product>;
  supplierMap: Map<string, Supplier>;
  warehouseMap: Map<number, Warehouse>;
  recordMap: Map<string, number>;
  recordsBySku: Map<string, InventoryRecord[]>;
  openPosBySku: Map<string, ProcessedOpenPo[]>;
  insights: InventoryInsight[];
  transactions: InventoryTransaction[];
}

function toProjectionArrival(p: ProcessedOpenPo): ProjectionArrival {
  return {
    poNumber: p.rawPo.poNumber,
    quantity: p.rawPo.quantity,
    isOverdue: p.isOverdue,
    daysOverdue: p.daysOverdue,
    effectiveArrivalDate: p.effectiveArrivalDate,
    originalExpectedDate: p.rawPo.expectedDate,
  };
}

/**
 * Shared setup for every projection: resolves lookups, supplier delay
 * history, and V2 overdue-PO rescheduling once so every SKU×warehouse
 * projection (suggestions, alerts, or the sawtooth chart) reads identical
 * inputs.
 */
function buildProjectionContext({
  insights,
  records,
  products,
  suppliers,
  warehouses,
  purchaseOrders = [],
  transactions = [],
}: ProjectionInputs): ProjectionContext {
  const today = todayISODate();
  const productMap = new Map(products.map((p) => [p.sku, p]));
  const supplierMap = new Map(suppliers.map((s) => [s.supplierId, s]));
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));
  const recordMap = new Map(records.map((r) => [`${r.sku}-${r.warehouseId}`, r.quantityOnHand]));

  // Index records by SKU for inter-warehouse transfer checks
  const recordsBySku = new Map<string, InventoryRecord[]>();
  for (const r of records) {
    const list = recordsBySku.get(r.sku) ?? [];
    list.push(r);
    recordsBySku.set(r.sku, list);
  }

  // Process and index open POs by SKU. Overdue POs are flagged but never
  // credited — no rescheduled ETA is invented for them, since there is no
  // evidence the units are actually in transit once the expected date has
  // passed without receipt.
  const openPosBySku = new Map<string, ProcessedOpenPo[]>();
  for (const po of purchaseOrders) {
    if (po.receivedDate === null) {
      const effectiveArrivalDate = po.expectedDate;
      const overdue = isPoOverdue(po, today);
      const daysOverdue = overdue ? daysBetween(po.expectedDate, today) : 0;
      const overdueNote = overdue
        ? `${po.poNumber} is ${daysOverdue}d overdue (was due ${po.expectedDate}) — excluded from available/pipeline inventory`
        : undefined;

      const list = openPosBySku.get(po.sku) ?? [];
      list.push({ rawPo: po, effectiveArrivalDate, isOverdue: overdue, daysOverdue, overdueNote });
      openPosBySku.set(po.sku, list);
    }
  }

  return { today, productMap, supplierMap, warehouseMap, recordMap, recordsBySku, openPosBySku, insights, transactions };
}

/**
 * Computes the full time-phased projection for one SKU at one warehouse —
 * demand, safety stock, the day-by-day forward simulation, and whether it
 * implies a reorder/expedite/transfer action. This is the single function
 * behind both `generateSuggestedPurchaseOrders` (alerts) and the sawtooth
 * chart, so they can never show different numbers for the same SKU.
 *
 * Implements:
 * - V2: Overdue POs rescheduled to revised ETA using supplier trailing average delay (never day 0).
 * - V3: Outlier-resistant trimmed demand & winsorized standard deviation (σ).
 * - V4.1: Strict donor solvency guard (donor must have surplus after own lead-time target).
 * - V5: Day-of-week demand multipliers (weekend adjustment).
 */
function computeSkuWarehouseProjection(
  insight: InventoryInsight,
  ctx: ProjectionContext
): SkuWarehouseProjection | null {
  const { today, productMap, supplierMap, warehouseMap, recordMap, recordsBySku, openPosBySku, insights, transactions } = ctx;

  const product = productMap.get(insight.sku);
  if (!product) return null;

  const supplier = supplierMap.get(product.supplierId);
  const warehouse = warehouseMap.get(insight.warehouseId);
  const leadTimeDays = supplier?.leadTimeDays ?? 14;
  const onHand = recordMap.get(`${insight.sku}-${insight.warehouseId}`) ?? insight.availableQuantity;

  // V3 Outlier-resistant velocity and winsorized sigma
  const rawDemand = averageDailyDemand(
    transactions.reduce((sum, t) => {
      if (t.sku === insight.sku && t.warehouseId === insight.warehouseId && t.direction === "OUT" && isWithinTrailingWindow(t.date, 90)) {
        return sum + t.quantity;
      }
      return sum;
    }, 0),
    90
  ) ?? (insight.averageDailyDemand || 0);

  const robustDemand = trimmedDailyDemand(transactions, insight.sku, insight.warehouseId, 90) ?? rawDemand;
  const demand = robustDemand;

  if (demand <= 0 && onHand <= 0) return null;

  const sigma = winsorizedDailyDemandStandardDeviation(transactions, insight.sku, insight.warehouseId, 90);
  const ss = sigma > 0
    ? variabilitySafetyStock(sigma, leadTimeDays, DEFAULT_SERVICE_LEVEL_Z)
    : (insight.safetyStock || demand * leadTimeDays * 0.5);

  // V5 Day-of-week multipliers
  const dowMultipliers = calculateDayOfWeekMultipliers(transactions, insight.sku, insight.warehouseId, 90);

  // Target stock under continuous daily review model
  const targetStock = Math.round((leadTimeDays + REVIEW_PERIOD_DAYS) * demand + ss);
  const targetCoverDays = Math.round(leadTimeDays + REVIEW_PERIOD_DAYS + (demand > 0 ? ss / demand : 0));

  // Coverage horizon for forward simulation
  const horizonDays = Math.max(leadTimeDays + Math.max(3, Math.round(leadTimeDays * 0.5)), 14);
  const horizonEndDate = addDaysISO(today, horizonDays);

  // Filter open POs for this SKU arriving within horizon. `horizonPOs` keeps
  // overdue POs for display (inboundDetailsList) so they stay visible,
  // clearly marked as excluded; `creditedHorizonPOs` drops them entirely —
  // that's the list every cover-days / reorder-quantity number below is
  // computed from, so an overdue PO's quantity is never counted as
  // available/pipeline inventory.
  const openPOs = openPosBySku.get(insight.sku) ?? [];
  const horizonPOs = openPOs.filter((p) => p.effectiveArrivalDate <= horizonEndDate);
  const sortedHorizonPOs = [...horizonPOs].sort((a, b) => a.effectiveArrivalDate.localeCompare(b.effectiveArrivalDate));
  const creditedHorizonPOs = horizonPOs.filter((p) => !p.isOverdue);
  const sortedCreditedHorizonPOs = [...creditedHorizonPOs].sort((a, b) => a.effectiveArrivalDate.localeCompare(b.effectiveArrivalDate));
  const firstInboundPo = sortedCreditedHorizonPOs[0];
  const totalInboundInHorizon = creditedHorizonPOs.reduce((sum, p) => sum + p.rawPo.quantity, 0);

  const inboundDetailsList: string[] = [];
  for (const p of sortedHorizonPOs) {
    if (p.overdueNote) {
      inboundDetailsList.push(`${p.rawPo.quantity.toLocaleString()} units (${p.overdueNote})`);
    } else {
      inboundDetailsList.push(
        `${p.rawPo.quantity.toLocaleString()} units (${p.rawPo.poNumber}) arriving ${p.effectiveArrivalDate.slice(5)}`
      );
    }
  }

  // Current on-hand cover in days
  const currentCoverDays = demand > 0 ? onHand / demand : (onHand > 0 ? 999 : 0);

  // --- C1 TIME-PHASED GAP EVALUATION ---
  let gapInboundPo: ProcessedOpenPo | null = null;
  let gapLengthDays = 0;
  let coveredThroughDate: string | null = null;
  let firstStockoutDate: string | null = null;

  if (firstInboundPo && demand > 0) {
    const daysUntilInbound = Math.max(0, daysBetween(today, firstInboundPo.effectiveArrivalDate));
    if (currentCoverDays < daysUntilInbound) {
      // Stockout occurs before inbound arrives!
      gapInboundPo = firstInboundPo;
      gapLengthDays = Math.max(1, Math.round(daysUntilInbound - currentCoverDays));
      const coverDaysInt = Math.floor(currentCoverDays);
      coveredThroughDate = addDaysISO(today, coverDaysInt);
      firstStockoutDate = addDaysISO(today, coverDaysInt + 1);
    }
  }

  // Day-by-day forward simulation with weekend adjustment (V5) — also the sawtooth
  // series. Only credited (non-overdue) POs step the balance up — an overdue PO
  // never appears as an arrival on the chart, matching its exclusion from cover-days.
  const { finalBalance: running, series } = simulateForwardProjection({
    startingOnHand: onHand,
    dailyDemand: demand,
    dowMultipliers,
    openPOs: creditedHorizonPOs,
    horizonDays,
    today,
  });

  // --- V4.1 DONOR SOLVENCY GUARD ---
  let surplusWarehouseCode: string | undefined;
  let surplusAvailableUnits: number | undefined;

  const allPositions = recordsBySku.get(insight.sku) ?? [];
  for (const otherPos of allPositions) {
    if (otherPos.warehouseId !== insight.warehouseId && otherPos.quantityOnHand > 0) {
      const otherInsight = insights.find(
        (ins) => ins.sku === insight.sku && ins.warehouseId === otherPos.warehouseId
      );
      const donorOnHand = otherPos.quantityOnHand;
      const donorDemand = otherInsight?.averageDailyDemand ?? 0;
      const donorLeadTime = supplier?.leadTimeDays ?? 14;
      const donorSafety = otherInsight?.safetyStock ?? variabilitySafetyStock(sigma, donorLeadTime);
      const donorTargetStock = (donorLeadTime + REVIEW_PERIOD_DAYS) * donorDemand + donorSafety;
      const donorSurplus = donorOnHand - donorTargetStock;

      // Candidate must be solvent after satisfying own target stock (proportional buffer: >= 20% of target stock or >= $50 value)
      const minBufferUnits = Math.max(1, Math.round(donorTargetStock * 0.20));
      const surplusValue = donorSurplus * (product.unitCost || 0);
      if (donorSurplus >= minBufferUnits && (surplusValue >= 50 || donorSurplus >= 10)) {
        const otherWh = warehouseMap.get(otherPos.warehouseId);
        surplusWarehouseCode = otherWh?.code ?? `WH-${otherPos.warehouseId}`;
        surplusAvailableUnits = Math.round(donorSurplus);
        break;
      }
    }
  }

  const unitPrice = product.unitCost;
  const projectedCover = demand > 0 ? Math.round(Math.max(0, onHand + totalInboundInHorizon) / demand) : targetCoverDays;

  // --- OUTCOMES ---
  let actionType: SuggestedOrderActionType | undefined;
  let suggestedQuantity = 0;

  if (gapInboundPo !== null) {
    // Outcome 1: Interim Stockout Gap (Expedite / Transfer)
    actionType =
      surplusWarehouseCode && surplusAvailableUnits && surplusAvailableUnits >= Math.round(demand * gapLengthDays)
        ? "transfer"
        : "expedite";
    suggestedQuantity = Math.max(0, Math.round(targetStock - onHand - totalInboundInHorizon));
  } else if (running < targetStock) {
    // Outcome 2: Net Reorder Needed (Ending position below target stock)
    const netNeeded = Math.max(0, Math.round(targetStock - onHand - totalInboundInHorizon));
    if (netNeeded > 0) {
      actionType = "reorder";
      suggestedQuantity = netNeeded;
    }
  }
  // Outcome 3 (no actionType): Fully covered through horizon

  return {
    sku: insight.sku,
    warehouseId: insight.warehouseId,
    warehouseCode: warehouse?.code ?? `WH-${insight.warehouseId}`,
    productName: product.name,
    category: product.category,
    supplierId: product.supplierId,
    supplierName: supplier?.name ?? product.supplierId,
    supplierLeadTimeDays: leadTimeDays,
    unitPrice,
    currentOnHand: onHand,
    dailyDemand: Math.round(demand * 10) / 10,
    rawDailyDemand: Math.round(rawDemand * 10) / 10,
    dailyDemandSigma: Math.round(sigma * 100) / 100,
    safetyStock: Math.round(ss * 10) / 10,
    reorderPoint: Math.round(insight.reorderPoint),
    targetStock,
    targetCoverDays,
    daysOfCoverCurrent: insight.daysOfStock,
    daysOfCoverProjected: projectedCover,
    horizonDays,
    today,
    series,
    inboundPos: sortedHorizonPOs.map(toProjectionArrival),
    allOpenPos: openPOs.map(toProjectionArrival),
    inboundDetailsList,
    totalInboundInHorizon,
    gapInboundPoNumber: gapInboundPo?.rawPo.poNumber,
    gapArrival: gapInboundPo ? toProjectionArrival(gapInboundPo) : undefined,
    gapDays: gapInboundPo ? gapLengthDays : undefined,
    firstStockoutDate,
    coveredThroughDate,
    surplusWarehouseCode,
    surplusAvailableUnits,
    actionType,
    suggestedQuantity,
  };
}

/**
 * Generates automated suggested PO & expedite recommendations from the shared
 * time-phased projection (see `computeSkuWarehouseProjection`).
 */
export function generateSuggestedPurchaseOrders(inputs: ProjectionInputs): SuggestedPurchaseOrder[] {
  const ctx = buildProjectionContext(inputs);
  const suggestions: SuggestedPurchaseOrder[] = [];

  for (const insight of inputs.insights) {
    const p = computeSkuWarehouseProjection(insight, ctx);
    if (!p || !p.actionType) continue;

    const base = {
      sku: p.sku,
      productName: p.productName,
      category: p.category,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      supplierLeadTimeDays: p.supplierLeadTimeDays,
      warehouseId: p.warehouseId,
      warehouseCode: p.warehouseCode,
      currentOnHand: p.currentOnHand,
      targetStock: p.targetStock,
      reorderPoint: p.reorderPoint,
      dailyDemand: p.dailyDemand,
      rawDailyDemand: p.rawDailyDemand,
      dailyDemandSigma: p.dailyDemandSigma,
      safetyStock: p.safetyStock,
      inboundQuantity: p.totalInboundInHorizon,
      inboundPoDetails: p.inboundDetailsList.join(", "),
      suggestedQuantity: p.suggestedQuantity,
      unitPrice: p.unitPrice,
      estimatedCost: Math.round(p.suggestedQuantity * p.unitPrice * 100) / 100,
      daysOfCoverCurrent: p.daysOfCoverCurrent,
      daysOfCoverProjected: p.daysOfCoverProjected,
      firstStockoutDate: p.firstStockoutDate,
      coveredThroughDate: p.coveredThroughDate,
    };

    if (p.actionType === "expedite" || p.actionType === "transfer") {
      const gap = p.gapArrival!;
      const arrivingDateStr = gap.effectiveArrivalDate.slice(5);
      const overduePrefix = gap.isOverdue
        ? ` (revised ETA ${arrivingDateStr}, ${gap.daysOverdue}d overdue)`
        : ` arrives ${arrivingDateStr}`;

      const reasoning =
        p.actionType === "transfer"
          ? `Covered through ${p.coveredThroughDate}. ${gap.poNumber}${overduePrefix}. ${p.gapDays}-day gap. Expedite the PO or transfer ${Math.min(
              p.surplusAvailableUnits!,
              Math.round(p.dailyDemand * (p.gapDays! + 2))
            ).toLocaleString()} units from ${p.surplusWarehouseCode} (${p.surplusAvailableUnits!.toLocaleString()} surplus available).`
          : `Covered through ${p.coveredThroughDate}. ${gap.poNumber}${overduePrefix}. ${p.gapDays}-day gap. Reordering does not solve this — expedite ${gap.poNumber} with ${p.supplierName}.`;

      suggestions.push({
        ...base,
        id: `SUG-EXP-${p.sku}-${p.warehouseId}`,
        actionType: p.actionType,
        reasoning,
        gapDays: p.gapDays,
        gapInboundPoNumber: p.gapInboundPoNumber,
        surplusWarehouseCode: p.surplusWarehouseCode,
        surplusAvailableUnits: p.surplusAvailableUnits,
      });
    } else {
      const inboundDateStr = p.allOpenPos[0]?.effectiveArrivalDate ? p.allOpenPos[0].effectiveArrivalDate.slice(5) : "soon";
      const inboundStr =
        p.totalInboundInHorizon > 0
          ? `${p.totalInboundInHorizon.toLocaleString()} arriving ${inboundDateStr}`
          : "0 inbound";
      const reasoning = `Need ${p.targetStock.toLocaleString()} (${p.targetCoverDays}d target) · ${p.currentOnHand.toLocaleString()} on hand · ${inboundStr} → order ${p.suggestedQuantity.toLocaleString()}.`;

      suggestions.push({
        ...base,
        id: `SUG-PO-${p.sku}-${p.warehouseId}`,
        actionType: "reorder",
        reasoning,
      });
    }
  }

  // Sort by urgency: expedite/transfer gaps first, then lowest days of cover
  suggestions.sort((a, b) => {
    if (a.actionType !== b.actionType) {
      if (a.actionType === "expedite" || a.actionType === "transfer") return -1;
      if (b.actionType === "expedite" || b.actionType === "transfer") return 1;
    }
    const coverA = a.daysOfCoverCurrent ?? 0;
    const coverB = b.daysOfCoverCurrent ?? 0;
    if (coverA !== coverB) {
      return coverA - coverB;
    }
    return b.estimatedCost - a.estimatedCost;
  });

  return suggestions;
}

/** Every SKU×warehouse time-phased projection — the data behind the sawtooth grid view. */
export function getAllSkuWarehouseProjections(inputs: ProjectionInputs): SkuWarehouseProjection[] {
  const ctx = buildProjectionContext(inputs);
  const results: SkuWarehouseProjection[] = [];
  for (const insight of inputs.insights) {
    const p = computeSkuWarehouseProjection(insight, ctx);
    if (p) results.push(p);
  }
  return results;
}

/** The time-phased projection for one SKU at one warehouse — the data behind the single-SKU sawtooth chart. */
export function getSkuWarehouseProjection(
  sku: string,
  warehouseId: number,
  inputs: ProjectionInputs
): SkuWarehouseProjection | null {
  const insight = inputs.insights.find((i) => i.sku === sku && i.warehouseId === warehouseId);
  if (!insight) return null;
  const ctx = buildProjectionContext(inputs);
  return computeSkuWarehouseProjection(insight, ctx);
}
