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
import { supplierAverageDelayDays } from "@/lib/metrics/supplier";

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
 * Normalized internal representation of an open PO with resolved expected ETA.
 * Overdue POs are never credited at day 0 — they are rescheduled based on supplier lateness (V2).
 */
interface ProcessedOpenPo {
  rawPo: PurchaseOrder;
  effectiveArrivalDate: string;
  isOverdue: boolean;
  daysOverdue: number;
  overdueNote?: string;
}

/**
 * Generates automated suggested PO & expedite recommendations using
 * a Day-by-Day Forward Simulation over the coverage horizon.
 *
 * Implements:
 * - V2: Overdue POs rescheduled to revised ETA using supplier trailing average delay (never day 0).
 * - V3: Outlier-resistant trimmed demand & winsorized standard deviation (σ).
 * - V4.1: Strict donor solvency guard (donor must have surplus after own lead-time target).
 * - V5: Day-of-week demand multipliers (weekend adjustment).
 */
export function generateSuggestedPurchaseOrders({
  insights,
  records,
  products,
  suppliers,
  warehouses,
  purchaseOrders = [],
  transactions = [],
}: {
  insights: InventoryInsight[];
  records: InventoryRecord[];
  products: Product[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  purchaseOrders?: PurchaseOrder[];
  transactions?: InventoryTransaction[];
}): SuggestedPurchaseOrder[] {
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

  // Pre-calculate supplier average delay days for V2 overdue rescheduling
  const supplierDelayMap = new Map<string, number | null>();
  for (const s of suppliers) {
    supplierDelayMap.set(s.supplierId, supplierAverageDelayDays(s.supplierId, purchaseOrders));
  }

  // Process and index open POs by SKU with overdue rescheduling
  const openPosBySku = new Map<string, ProcessedOpenPo[]>();
  for (const po of purchaseOrders) {
    if (po.receivedDate === null) {
      let effectiveArrivalDate = po.expectedDate;
      let isOverdue = false;
      let daysOverdue = 0;
      let overdueNote: string | undefined;

      if (po.expectedDate < today) {
        isOverdue = true;
        daysOverdue = daysBetween(po.expectedDate, today);
        const avgDelay = supplierDelayMap.get(po.supplierId);

        if (typeof avgDelay === "number" && avgDelay > 0) {
          // Option (b): Reschedule to revised ETA based on supplier average delay
          const additionalDays = Math.max(1, Math.round(avgDelay));
          effectiveArrivalDate = addDaysISO(today, additionalDays);
          overdueNote = `${po.poNumber} overdue ${daysOverdue}d, revised ETA ${effectiveArrivalDate.slice(5)} based on supplier average (+${avgDelay}d)`;
        } else {
          // Option (a): Fallback when no supplier delay history is available -> exclude from horizon
          effectiveArrivalDate = "9999-12-31";
          overdueNote = `${po.poNumber} overdue ${daysOverdue}d (excluded from projection due to missing supplier history)`;
        }
      }

      const list = openPosBySku.get(po.sku) ?? [];
      list.push({
        rawPo: po,
        effectiveArrivalDate,
        isOverdue,
        daysOverdue,
        overdueNote,
      });
      openPosBySku.set(po.sku, list);
    }
  }

  const suggestions: SuggestedPurchaseOrder[] = [];

  for (const insight of insights) {
    const product = productMap.get(insight.sku);
    if (!product) continue;

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

    if (demand <= 0 && onHand <= 0) continue;

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

    // Filter open POs for this SKU arriving within horizon
    const openPOs = openPosBySku.get(insight.sku) ?? [];
    const horizonPOs = openPOs.filter((p) => p.effectiveArrivalDate <= horizonEndDate);
    const sortedHorizonPOs = [...horizonPOs].sort((a, b) => a.effectiveArrivalDate.localeCompare(b.effectiveArrivalDate));
    const firstInboundPo = sortedHorizonPOs[0];
    const totalInboundInHorizon = horizonPOs.reduce((sum, p) => sum + p.rawPo.quantity, 0);

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

    // Run day-by-day forward simulation loop with weekend adjustment (V5)
    let running = onHand;
    for (let d = 1; d <= horizonDays; d++) {
      const currentDate = addDaysISO(today, d);
      const currentDow = new Date(currentDate + "T00:00:00Z").getUTCDay();
      const dayDemand = demand * (dowMultipliers[currentDow] ?? 1.0);

      const arriving = openPOs.filter((p) => p.effectiveArrivalDate === currentDate);
      for (const p of arriving) running += p.rawPo.quantity;
      running -= dayDemand;
    }

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
    // Outcome 1: Interim Stockout Gap (Expedite / Transfer)
    if (gapInboundPo !== null) {
      const poObj = gapInboundPo.rawPo;
      const arrivingDateStr = gapInboundPo.effectiveArrivalDate.slice(5);
      let actionType: SuggestedOrderActionType = "expedite";
      let reasoning = "";

      const overduePrefix = gapInboundPo.isOverdue
        ? ` (revised ETA ${arrivingDateStr}, ${gapInboundPo.daysOverdue}d overdue)`
        : ` arrives ${arrivingDateStr}`;

      if (surplusWarehouseCode && surplusAvailableUnits && surplusAvailableUnits >= Math.round(demand * gapLengthDays)) {
        actionType = "transfer";
        const transferQty = Math.min(surplusAvailableUnits, Math.round(demand * (gapLengthDays + 2)));
        reasoning = `Covered through ${coveredThroughDate}. ${poObj.poNumber}${overduePrefix}. ${gapLengthDays}-day gap. Expedite the PO or transfer ${transferQty.toLocaleString()} units from ${surplusWarehouseCode} (${surplusAvailableUnits.toLocaleString()} surplus available).`;
      } else {
        reasoning = `Covered through ${coveredThroughDate}. ${poObj.poNumber}${overduePrefix}. ${gapLengthDays}-day gap. Reordering does not solve this — expedite ${poObj.poNumber} with ${supplier?.name ?? product.supplierId}.`;
      }

      const postInboundDeficit = Math.max(0, Math.round(targetStock - onHand - totalInboundInHorizon));

      suggestions.push({
        id: `SUG-EXP-${insight.sku}-${insight.warehouseId}`,
        sku: insight.sku,
        productName: product.name,
        category: product.category,
        supplierId: product.supplierId,
        supplierName: supplier?.name ?? product.supplierId,
        supplierLeadTimeDays: leadTimeDays,
        warehouseId: insight.warehouseId,
        warehouseCode: warehouse?.code ?? `WH-${insight.warehouseId}`,
        currentOnHand: onHand,
        targetStock,
        reorderPoint: Math.round(insight.reorderPoint),
        dailyDemand: Math.round(demand * 10) / 10,
        rawDailyDemand: Math.round(rawDemand * 10) / 10,
        dailyDemandSigma: Math.round(sigma * 100) / 100,
        safetyStock: Math.round(ss * 10) / 10,
        inboundQuantity: totalInboundInHorizon,
        inboundPoDetails: inboundDetailsList.join(", "),
        suggestedQuantity: postInboundDeficit,
        actionType,
        unitPrice,
        estimatedCost: Math.round(postInboundDeficit * unitPrice * 100) / 100,
        daysOfCoverCurrent: insight.daysOfStock,
        daysOfCoverProjected: projectedCover,
        reasoning,
        firstStockoutDate,
        coveredThroughDate,
        gapDays: gapLengthDays,
        gapInboundPoNumber: poObj.poNumber,
        surplusWarehouseCode,
        surplusAvailableUnits,
      });
    }
    // Outcome 2: Net Reorder Needed (Ending position below target stock)
    else if (running < targetStock) {
      const netNeeded = Math.max(0, Math.round(targetStock - onHand - totalInboundInHorizon));
      if (netNeeded > 0) {
        const inboundDateStr = openPOs[0]?.effectiveArrivalDate ? openPOs[0].effectiveArrivalDate.slice(5) : "soon";
        const inboundStr =
          totalInboundInHorizon > 0
            ? `${totalInboundInHorizon.toLocaleString()} arriving ${inboundDateStr}`
            : "0 inbound";
        const reasoning = `Need ${targetStock.toLocaleString()} (${targetCoverDays}d target) · ${onHand.toLocaleString()} on hand · ${inboundStr} → order ${netNeeded.toLocaleString()}.`;

        suggestions.push({
          id: `SUG-PO-${insight.sku}-${insight.warehouseId}`,
          sku: insight.sku,
          productName: product.name,
          category: product.category,
          supplierId: product.supplierId,
          supplierName: supplier?.name ?? product.supplierId,
          supplierLeadTimeDays: leadTimeDays,
          warehouseId: insight.warehouseId,
          warehouseCode: warehouse?.code ?? `WH-${insight.warehouseId}`,
          currentOnHand: onHand,
          targetStock,
          reorderPoint: Math.round(insight.reorderPoint),
          dailyDemand: Math.round(demand * 10) / 10,
          rawDailyDemand: Math.round(rawDemand * 10) / 10,
          dailyDemandSigma: Math.round(sigma * 100) / 100,
          safetyStock: Math.round(ss * 10) / 10,
          inboundQuantity: totalInboundInHorizon,
          inboundPoDetails: inboundDetailsList.join(", "),
          suggestedQuantity: netNeeded,
          actionType: "reorder",
          unitPrice,
          estimatedCost: Math.round(netNeeded * unitPrice * 100) / 100,
          daysOfCoverCurrent: insight.daysOfStock,
          daysOfCoverProjected: projectedCover,
          reasoning,
          firstStockoutDate,
          coveredThroughDate,
        });
      }
    }
    // Outcome 3: Fully covered through horizon
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
