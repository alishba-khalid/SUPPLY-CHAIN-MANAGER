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

export function overallHealthScore(parts: {
  inventory: number;
  supplier: number;
  procurement: number;
  logistics: number;
  warehouse: number;
}): SupplyChainHealthBreakdown {
  const overall =
    parts.inventory * WEIGHTS.inventory +
    parts.supplier * WEIGHTS.supplier +
    parts.procurement * WEIGHTS.procurement +
    parts.logistics * WEIGHTS.logistics +
    parts.warehouse * WEIGHTS.warehouse;

  return {
    overall: Math.min(100, Math.max(0, Math.round(overall))),
    inventory: Math.round(parts.inventory),
    supplier: Math.round(parts.supplier),
    procurement: Math.round(parts.procurement),
    logistics: Math.round(parts.logistics),
    warehouse: Math.round(parts.warehouse),
  };
}
