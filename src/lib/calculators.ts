/**
 * Pure maths behind the /tools calculators. No data leaves the browser; the
 * calculators call these functions on the client. Formulas are the standard
 * textbook ones (and the ones the app's own planning uses for safety stock).
 */

/** z-scores of the standard normal distribution for common cycle service levels. */
export const SERVICE_LEVEL_Z: Record<number, number> = {
  0.9: 1.2816,
  0.95: 1.6449,
  0.97: 1.8808,
  0.98: 2.0537,
  0.99: 2.3263,
};

export function reorderPoint(dailyDemand: number, leadTimeDays: number, safetyStock: number): number {
  return dailyDemand * leadTimeDays + safetyStock;
}

export function statisticalSafetyStock(serviceLevel: number, demandSigmaDaily: number, leadTimeDays: number): number | null {
  const z = SERVICE_LEVEL_Z[serviceLevel];
  if (z === undefined || demandSigmaDaily < 0 || leadTimeDays <= 0) return null;
  return z * demandSigmaDaily * Math.sqrt(leadTimeDays);
}

/** Max-average method: (maximum daily use × longest lead time) − (average daily use × average lead time). */
export function simpleSafetyStock(maxDaily: number, maxLeadDays: number, avgDaily: number, avgLeadDays: number): number {
  return Math.max(0, maxDaily * maxLeadDays - avgDaily * avgLeadDays);
}

export interface EoqResult {
  eoq: number;
  ordersPerYear: number;
  daysBetweenOrders: number;
  annualOrderingCost: number;
  annualHoldingCost: number;
}

export function economicOrderQuantity(annualDemand: number, orderCost: number, holdingCostPerUnitYear: number): EoqResult | null {
  if (!(annualDemand > 0) || !(orderCost > 0) || !(holdingCostPerUnitYear > 0)) return null;
  const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnitYear);
  const ordersPerYear = annualDemand / eoq;
  return {
    eoq,
    ordersPerYear,
    daysBetweenOrders: 365 / ordersPerYear,
    annualOrderingCost: ordersPerYear * orderCost,
    annualHoldingCost: (eoq / 2) * holdingCostPerUnitYear,
  };
}
