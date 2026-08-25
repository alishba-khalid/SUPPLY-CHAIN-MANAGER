/**
 * Inventory metrics. See docs/metrics.md for business definitions,
 * assumptions, and worked examples.
 */
import type { InventoryStatus, InventoryTransaction, InventoryInsight } from "@/types/supply-chain";
import { isWithinTrailingWindow } from "@/lib/dates";

const TRAILING_WINDOW_DAYS = 90;
const OVERSTOCK_HORIZON_DAYS = 30;
const STOCK_OUT_RISK_DAYS = 3;
const SLOW_MOVING_DAYS = 180;

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

export function safetyStock(avgDailyDemand: number | null, supplierLeadTimeDays: number): number {
  return (avgDailyDemand ?? 0) * safetyLeadTimeDays(supplierLeadTimeDays);
}

/** Demand expected during the full replenishment lead time, plus the safety buffer. */
export function reorderPoint(avgDailyDemand: number | null, supplierLeadTimeDays: number): number {
  const demand = avgDailyDemand ?? 0;
  return demand * supplierLeadTimeDays + safetyStock(avgDailyDemand, supplierLeadTimeDays);
}

export function overstockThreshold(avgDailyDemand: number | null, supplierLeadTimeDays: number): number {
  const demand = avgDailyDemand ?? 0;
  return safetyStock(avgDailyDemand, supplierLeadTimeDays) + demand * OVERSTOCK_HORIZON_DAYS;
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
  const avgDemand = averageDailyDemand(trailing, windowDays);
  const dos = daysOfStock(record.quantityOnHand, avgDemand);
  const ss = safetyStock(avgDemand, supplierLeadTimeDays);
  const rp = reorderPoint(avgDemand, supplierLeadTimeDays);
  const ot = overstockThreshold(avgDemand, supplierLeadTimeDays);

  return {
    sku: record.sku,
    warehouseId: record.warehouseId,
    availableQuantity: record.quantityOnHand,
    averageDailyDemand: avgDemand !== null ? Math.round(avgDemand * 100) / 100 : null,
    daysOfStock: dos !== null ? Math.round(dos * 10) / 10 : null,
    safetyStock: Math.round(ss * 100) / 100,
    reorderPoint: Math.round(rp * 100) / 100,
    overstockThreshold: Math.round(ot * 100) / 100,
    status: classifyInventoryStatus({
      availableQuantity: record.quantityOnHand,
      avgDailyDemand: avgDemand,
      daysOfStockValue: dos,
      safetyStockValue: ss,
      overstockThresholdValue: ot,
    }),
  };
}

/** Percentage of SKUs whose current stock sits inside [safetyStock, overstockThreshold]. */
export function inventoryHealthScore(insights: InventoryInsight[]): number {
  if (insights.length === 0) return 0;
  const healthyCount = insights.filter((i) => isHealthy(i.availableQuantity, i.safetyStock, i.overstockThreshold)).length;
  const pct = (healthyCount / insights.length) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}
