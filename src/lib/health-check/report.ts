/**
 * Health check result types + the downloadable CSV report. Kept apart from
 * analyze.ts so the page can render results and build the report without
 * pulling the xlsx parser into its bundle — parsing runs in worker.ts.
 */

import type { InventoryStatus } from "@/types/supply-chain";

export const STOCKOUT_HORIZON_DAYS = 14;

export type DemandSource = "daily_history" | "weekly_history" | "average";

export interface SkuResult {
  sku: string;
  onHand: number;
  unitCost: number | null;
  leadTimeDays: number;
  leadTimeDefaulted: boolean;
  avgDailyDemand: number | null;
  daysOfCover: number | null;
  reorderPoint: number;
  overstockThreshold: number;
  excessUnits: number;
  excessValue: number;
  status: InventoryStatus;
  stockoutRisk: boolean;
  demandSource: DemandSource;
}

export interface HealthCheckResult {
  skuCount: number;
  stockoutRiskCount: number;
  excessValue: number;
  topRisk: SkuResult[];
  topExcess: SkuResult[];
  rows: SkuResult[];
  demandSource: DemandSource;
  warnings: string[];
}


function csvCell(v: string | number | boolean | null): string {
  if (v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Full per-SKU report, sorted by stockout risk first, then excess cash. */
export function healthCheckReportCsv(result: HealthCheckResult): string {
  const header = [
    "sku", "status", "stockout_risk_14d", "on_hand_qty", "unit_cost", "avg_daily_demand", "days_of_cover",
    "lead_time_days", "lead_time_assumed", "reorder_point", "overstock_threshold", "excess_units", "excess_value_usd",
  ];
  const sorted = [...result.rows].sort(
    (a, b) => Number(b.stockoutRisk) - Number(a.stockoutRisk) || b.excessValue - a.excessValue,
  );
  const lines = sorted.map((r) =>
    [
      r.sku, r.status, r.stockoutRisk, r.onHand, r.unitCost, r.avgDailyDemand, r.daysOfCover, r.leadTimeDays,
      r.leadTimeDefaulted, r.reorderPoint, r.overstockThreshold, r.excessUnits, r.excessValue,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
