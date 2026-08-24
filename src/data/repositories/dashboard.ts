import type { Recommendation, SupplyChainAlert, SupplyChainHealthBreakdown } from "@/types/supply-chain";
import { getInventoryHealthScore } from "./inventory";
import { getSupplierHealthScore } from "./suppliers";
import { getProcurementHealthScore } from "./procurement";
import { getLogisticsHealthScore } from "./shipments";
import { getWarehouseHealthScore } from "./warehouses";
import { overallHealthScore } from "@/lib/metrics/health";
import { getAlerts } from "@/lib/insights/alerts";
import { getRecommendations } from "@/lib/insights/recommendations";

export async function getSupplyChainHealth(): Promise<SupplyChainHealthBreakdown> {
  const [inventory, supplier, procurement, logistics, warehouse] = await Promise.all([
    getInventoryHealthScore(),
    getSupplierHealthScore(),
    getProcurementHealthScore(),
    getLogisticsHealthScore(),
    getWarehouseHealthScore(),
  ]);

  return overallHealthScore({ inventory, supplier, procurement, logistics, warehouse });
}

export async function getDashboardAlerts(): Promise<SupplyChainAlert[]> {
  return getAlerts();
}

export async function getDashboardRecommendations(): Promise<Recommendation[]> {
  return getRecommendations();
}
