/**
 * Warehouse health metrics. See docs/metrics.md.
 */
import type { InventoryInsight } from "@/types/supply-chain";

const HEALTHY_MIN_UTILIZATION = 70;
const HEALTHY_MAX_UTILIZATION = 90;
const OVER_CAPACITY_RISK_CEILING = 130; // utilization % at which the score bottoms out

/**
 * The warehouse's capacity if it is actually known, else null. Missing
 * (null) and non-positive values both mean "not provided" — 0 was written
 * as a stand-in for blank before capacity became nullable. Never
 * substitute a number for an unknown capacity.
 */
export function knownCapacity(capacityUnits: number | null | undefined): number | null {
  return capacityUnits != null && capacityUnits > 0 ? capacityUnits : null;
}

/** Utilization %, or null when capacity is unknown — there is nothing to divide by. */
export function capacityUtilization(onHandUnits: number, capacityUnits: number | null): number | null {
  const capacity = knownCapacity(capacityUnits);
  if (capacity === null) return null;
  return (onHandUnits / capacity) * 100;
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

/**
 * Null when the utilization score is unknown (capacity not set): the score
 * is a 50/50 blend, and half of it can't be invented.
 */
export function warehouseHealthScore(utilizationScore: number | null, issueRateScore: number): number | null {
  if (utilizationScore === null) return null;
  const score = utilizationScore * 0.5 + issueRateScore * 0.5;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Average health across the warehouses whose health is known. Null when
 * none is — warehouses with unknown capacity are left out, not scored 0.
 */
export function averageWarehouseHealth(scores: (number | null)[]): number | null {
  const known = scores.filter((s): s is number => s !== null);
  if (known.length === 0) return null;
  return Math.round(known.reduce((a, b) => a + b, 0) / known.length);
}
