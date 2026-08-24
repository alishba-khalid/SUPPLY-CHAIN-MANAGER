/**
 * Warehouse health metrics. See docs/metrics.md.
 */
import type { InventoryInsight } from "@/types/supply-chain";

const HEALTHY_MIN_UTILIZATION = 70;
const HEALTHY_MAX_UTILIZATION = 90;
const OVER_CAPACITY_RISK_CEILING = 130; // utilization % at which the score bottoms out

export function capacityUtilization(onHandUnits: number, capacityUnits: number): number {
  if (capacityUnits <= 0) return 0;
  return (onHandUnits / capacityUnits) * 100;
}

export type UtilizationBand = "underutilized" | "healthy" | "risk";

export function utilizationBand(utilizationPercent: number): UtilizationBand {
  if (utilizationPercent < HEALTHY_MIN_UTILIZATION) return "underutilized";
  if (utilizationPercent <= HEALTHY_MAX_UTILIZATION) return "healthy";
  return "risk";
}

/**
 * 100 within the 70-90% healthy band; scales down toward 0 outside it —
 * linearly to 0% utilization on the low side, and to 130%+ utilization
 * (over-capacity) on the high side.
 */
export function capacityUtilizationScore(utilizationPercent: number): number {
  if (utilizationPercent >= HEALTHY_MIN_UTILIZATION && utilizationPercent <= HEALTHY_MAX_UTILIZATION) return 100;
  if (utilizationPercent < HEALTHY_MIN_UTILIZATION) {
    return Math.max(0, Math.round((utilizationPercent / HEALTHY_MIN_UTILIZATION) * 100));
  }
  const over = utilizationPercent - HEALTHY_MAX_UTILIZATION;
  const span = OVER_CAPACITY_RISK_CEILING - HEALTHY_MAX_UTILIZATION;
  return Math.max(0, Math.round(100 - (over / span) * 100));
}

/** 100 minus the % of stocked SKUs at this warehouse that are not in "healthy" inventory status. */
export function inventoryIssueRateScore(insights: InventoryInsight[]): number {
  if (insights.length === 0) return 100;
  const issues = insights.filter((i) => i.status !== "healthy").length;
  const issueRate = (issues / insights.length) * 100;
  return Math.min(100, Math.max(0, Math.round(100 - issueRate)));
}

export function warehouseHealthScore(utilizationScore: number, issueRateScore: number): number {
  const score = utilizationScore * 0.5 + issueRateScore * 0.5;
  return Math.min(100, Math.max(0, Math.round(score)));
}
