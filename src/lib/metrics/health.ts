/**
 * Overall Supply Chain Health Score — a weighted roll-up of the five
 * component scores. See docs/metrics.md.
 */
import type { SupplyChainHealthBreakdown } from "@/types/supply-chain";

const WEIGHTS = {
  inventory: 0.3,
  supplier: 0.2,
  procurement: 0.2,
  logistics: 0.2,
  warehouse: 0.1,
} as const;

export type HealthScoreTone = "healthy" | "warning" | "critical";

/** >=80 healthy, 60-79 warning, <60 critical — shared threshold for card colour-coding and Needs Attention call-outs. */
export const HEALTH_CRITICAL_THRESHOLD = 60;
const HEALTH_WARNING_THRESHOLD = 80;

export function healthScoreTone(score: number): HealthScoreTone {
  if (score >= HEALTH_WARNING_THRESHOLD) return "healthy";
  if (score >= HEALTH_CRITICAL_THRESHOLD) return "warning";
  return "critical";
}

/**
 * `supplier` is null when no supplier has on-time data in the window, and
 * `warehouse` is null when no warehouse has a known capacity. The overall
 * score is then the weighted average of the known components (their weights
 * re-normalized), rather than counting an unknown part as 0.
 */
export function overallHealthScore(parts: {
  inventory: number;
  supplier: number | null;
  procurement: number;
  logistics: number;
  warehouse: number | null;
}): SupplyChainHealthBreakdown {
  const known = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).filter((k) => parts[k] !== null);
  const weighted = known.reduce((sum, k) => sum + (parts[k] as number) * WEIGHTS[k], 0);
  const totalWeight = known.reduce((sum, k) => sum + WEIGHTS[k], 0);
  const overall = weighted / totalWeight;

  return {
    overall: Math.min(100, Math.max(0, Math.round(overall))),
    inventory: Math.round(parts.inventory),
    supplier: parts.supplier === null ? null : Math.round(parts.supplier),
    procurement: Math.round(parts.procurement),
    logistics: Math.round(parts.logistics),
    warehouse: parts.warehouse === null ? null : Math.round(parts.warehouse),
  };
}
