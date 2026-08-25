import type { ActivityEvent, Recommendation, SupplyChainAlert, SupplyChainHealthBreakdown, TrendPoint } from "@/types/supply-chain";
import { getInventoryHealthScore, getInventoryTransactions } from "./inventory";
import { getSupplierHealthScore } from "./suppliers";
import { getProcurementHealthScore, getPurchaseOrders } from "./procurement";
import { getLogisticsHealthScore, getShipments } from "./shipments";
import { getWarehouseHealthScore } from "./warehouses";
import { getCustomerOrders } from "./customers";
import { overallHealthScore } from "@/lib/metrics/health";
import {
  inventoryMovementTrend,
  onTimeShipmentRateTrend,
  orderVolumeTrend,
  procurementSpendTrend,
} from "@/lib/metrics/trends";
import { getAlerts } from "@/lib/insights/alerts";
import { getRecommendations } from "@/lib/insights/recommendations";
import { getRecentActivity } from "@/lib/insights/activity";

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

export interface OverviewTrends {
  procurementSpend: TrendPoint[];
  onTimeShipmentRate: TrendPoint[];
  orderVolume: TrendPoint[];
  inventoryInbound: TrendPoint[];
  inventoryOutbound: TrendPoint[];
}

export async function getOverviewTrends(): Promise<OverviewTrends> {
  const [purchaseOrders, shipments, customerOrders, transactions] = await Promise.all([
    getPurchaseOrders(),
    getShipments(),
    getCustomerOrders(),
    getInventoryTransactions(),
  ]);

  const movement = inventoryMovementTrend(transactions);

  return {
    procurementSpend: procurementSpendTrend(purchaseOrders),
    onTimeShipmentRate: onTimeShipmentRateTrend(shipments),
    orderVolume: orderVolumeTrend(customerOrders),
    inventoryInbound: movement.inbound,
    inventoryOutbound: movement.outbound,
  };
}

export async function getRecentActivityFeed(limit?: number): Promise<ActivityEvent[]> {
  return getRecentActivity(limit);
}
