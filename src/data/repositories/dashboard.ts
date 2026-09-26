import type {
  ActivityEvent,
  Product,
  Recommendation,
  Supplier,
  SupplyChainAlert,
  SupplyChainHealthBreakdown,
  TrendPoint,
  Warehouse,
} from "@/types/supply-chain";
import { getInventoryInsights, getInventoryRecords, getInventoryTransactions } from "./inventory";
import { getSuppliers } from "./suppliers";
import { getPurchaseOrders } from "./procurement";
import { getProducts } from "./products";
import { getWarehouses } from "./warehouses";
import { getOrgSubscription } from "./subscription";
import { overallHealthScore } from "@/lib/metrics/health";
import { buildInventoryInsight, inventoryHealthScore } from "@/lib/metrics/inventory";
import { computeSupplierPerformance, supplierHealthScore, poOnTimeRate } from "@/lib/metrics/supplier";
import {
  procurementHealthScore,
  procurementFulfillmentScore,
  procurementCycleTimeScore,
  procurementPriceStabilityScore,
} from "@/lib/metrics/procurement";
import { logisticsHealthScore } from "@/lib/metrics/logistics";
import {
  capacityUtilization,
  capacityUtilizationScore,
  averageWarehouseHealth,
  inventoryIssueRateScore,
  warehouseHealthScore,
} from "@/lib/metrics/warehouse";
import { inventoryMovementTrend, onTimeShipmentRateTrend, poVolumeTrend, procurementSpendTrend } from "@/lib/metrics/trends";
import { getAlerts } from "@/lib/insights/alerts";
import { getRecommendations } from "@/lib/insights/recommendations";
import { getRecentActivity } from "@/lib/insights/activity";
import { buildHealthScoreAlerts, type WarehouseScoreDetail } from "@/lib/insights/health-alerts";

export interface OverviewDashboardData {
  products: Product[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  health: SupplyChainHealthBreakdown;
  alerts: SupplyChainAlert[];
  recommendations: Recommendation[];
  trends: OverviewTrends;
  activity: ActivityEvent[];
  subscription: Awaited<ReturnType<typeof getOrgSubscription>>;
}

export async function getSupplyChainHealth(orgId: string): Promise<SupplyChainHealthBreakdown> {
  const [insights, purchaseOrders, products, suppliers, warehouses, records] = await Promise.all([
    getInventoryInsights(orgId),
    getPurchaseOrders(orgId),
    getProducts(orgId),
    getSuppliers(orgId),
    getWarehouses(orgId),
    getInventoryRecords(orgId),
  ]);

  const inventory = inventoryHealthScore(insights);
  const supplierPerformances = suppliers.map((s) => computeSupplierPerformance(s.supplierId, purchaseOrders));
  const supplier = supplierHealthScore(supplierPerformances);
  const baselineCost = new Map(products.map((p) => [p.sku, p.unitCost]));
  const procurement = procurementHealthScore(purchaseOrders, baselineCost);
  const logistics = logisticsHealthScore(purchaseOrders);

  const warehouseScores = warehouses.map((w) => {
    const onHand = records.filter((r) => r.warehouseId === w.id).reduce((sum, r) => sum + r.quantityOnHand, 0);
    const utilPercent = capacityUtilization(onHand, w.capacityUnits);
    const utilScore = utilPercent === null ? null : capacityUtilizationScore(utilPercent);
    const issueScore = inventoryIssueRateScore(insights.filter((i) => i.warehouseId === w.id));
    return warehouseHealthScore(utilScore, issueScore);
  });
  // Warehouses with unknown capacity are left out; null if none is known.
  const warehouse = averageWarehouseHealth(warehouseScores);

  return overallHealthScore({ inventory, supplier, procurement, logistics, warehouse });
}

export async function getDashboardAlerts(orgId: string): Promise<SupplyChainAlert[]> {
  return getAlerts(orgId);
}

export async function getDashboardRecommendations(orgId: string): Promise<Recommendation[]> {
  return getRecommendations(orgId);
}

export interface OverviewTrends {
  procurementSpend: TrendPoint[];
  onTimeShipmentRate: TrendPoint[];
  poVolume: TrendPoint[];
  inventoryInbound: TrendPoint[];
  inventoryOutbound: TrendPoint[];
}

export async function getOverviewTrends(orgId: string): Promise<OverviewTrends> {
  const [purchaseOrders, transactions] = await Promise.all([getPurchaseOrders(orgId), getInventoryTransactions(orgId)]);

  const movement = inventoryMovementTrend(transactions);

  return {
    procurementSpend: procurementSpendTrend(purchaseOrders),
    onTimeShipmentRate: onTimeShipmentRateTrend(purchaseOrders),
    poVolume: poVolumeTrend(purchaseOrders),
    inventoryInbound: movement.inbound,
    inventoryOutbound: movement.outbound,
  };
}

export async function getRecentActivityFeed(orgId: string, limit?: number): Promise<ActivityEvent[]> {
  return getRecentActivity(orgId, limit);
}

/**
 * Consolidated single-pass data loader for the Overview Dashboard.
 * Eliminates 30+ redundant concurrent DB calls, avoiding connection pool starvation.
 */
export async function getOverviewDashboardData(orgId: string): Promise<OverviewDashboardData> {
  const [products, suppliers, warehouses, records, transactions, purchaseOrders, subscription] = await Promise.all([
    getProducts(orgId),
    getSuppliers(orgId),
    getWarehouses(orgId),
    getInventoryRecords(orgId),
    getInventoryTransactions(orgId),
    getPurchaseOrders(orgId),
    getOrgSubscription(orgId),
  ]);

  const supplierLeadTimes = new Map(suppliers.map((s) => [s.supplierId, s.leadTimeDays]));
  const productSuppliers = new Map(products.map((p) => [p.sku, p.supplierId]));
  const insights = records.map((record) => {
    const supplierId = productSuppliers.get(record.sku);
    const rawLeadTime = supplierId ? supplierLeadTimes.get(supplierId) : undefined;
    const leadTime = typeof rawLeadTime === "number" && rawLeadTime > 0 ? rawLeadTime : 14;
    return buildInventoryInsight(transactions, record, leadTime);
  });

  const inventory = inventoryHealthScore(insights);
  const supplierPerformances = suppliers.map((s) => computeSupplierPerformance(s.supplierId, purchaseOrders));
  const openPOs = purchaseOrders.filter((po) => po.receivedDate === null);

  const [alerts, recommendations] = await Promise.all([
    getAlerts(orgId, {
      insights,
      supplierPerf: supplierPerformances,
      openPOs,
      products,
      suppliers,
      warehouses,
      transactions,
    }),
    getRecommendations(orgId),
  ]);
  const supplier = supplierHealthScore(supplierPerformances);
  const baselineCost = new Map(products.map((p) => [p.sku, p.unitCost]));
  const procurement = procurementHealthScore(purchaseOrders, baselineCost);
  const logistics = logisticsHealthScore(purchaseOrders);

  const warehouseDetails = warehouses.map((w) => {
    const onHand = records.filter((r) => r.warehouseId === w.id).reduce((sum, r) => sum + r.quantityOnHand, 0);
    const utilPercent = capacityUtilization(onHand, w.capacityUnits);
    const utilScore = utilPercent === null ? null : capacityUtilizationScore(utilPercent);
    const issueScore = inventoryIssueRateScore(insights.filter((i) => i.warehouseId === w.id));
    return { warehouse: w, utilizationPercent: utilPercent, issueRateScore: issueScore, score: warehouseHealthScore(utilScore, issueScore) };
  });
  // Warehouses with unknown capacity are left out; null if none is known.
  const warehouse = averageWarehouseHealth(warehouseDetails.map((w) => w.score));

  const health = overallHealthScore({ inventory, supplier, procurement, logistics, warehouse });

  // Explains any critically-low score card as a "Needs Attention" entry, so
  // a low number is never left unexplained on the dashboard.
  const suppliersWithOtif = supplierPerformances.filter((p) => p.otifPercent !== null);
  const worstSupplierPerf = suppliersWithOtif.length
    ? suppliersWithOtif.reduce((worst, p) => ((p.otifPercent as number) < (worst.otifPercent as number) ? p : worst))
    : undefined;
  const worstSupplier = worstSupplierPerf
    ? { supplierId: worstSupplierPerf.supplierId, name: suppliers.find((s) => s.supplierId === worstSupplierPerf.supplierId)?.name ?? worstSupplierPerf.supplierId, otifPercent: worstSupplierPerf.otifPercent as number }
    : undefined;
  // Only warehouses with a known capacity can be "the weakest position".
  const scoredWarehouses = warehouseDetails.filter(
    (w): w is WarehouseScoreDetail => w.score !== null && w.utilizationPercent !== null,
  );
  const worstWarehouse = scoredWarehouses.length
    ? scoredWarehouses.reduce((worst, w) => (w.score < worst.score ? w : worst))
    : null;

  const healthAlerts = buildHealthScoreAlerts({
    inventory: { score: inventory, unhealthyCount: insights.filter((i) => i.status !== "healthy").length, totalCount: insights.length },
    supplier: { score: supplier, worst: worstSupplier },
    procurement: {
      score: procurement,
      fulfillment: procurementFulfillmentScore(purchaseOrders),
      cycleTime: procurementCycleTimeScore(purchaseOrders),
      priceStability: procurementPriceStabilityScore(purchaseOrders, baselineCost),
    },
    logistics: { score: logistics, onTimeRate: poOnTimeRate(purchaseOrders) },
    warehouse: { score: warehouse, worst: worstWarehouse },
  });
  const allAlerts = [...healthAlerts, ...alerts];

  const movement = inventoryMovementTrend(transactions);
  const trends: OverviewTrends = {
    procurementSpend: procurementSpendTrend(purchaseOrders),
    onTimeShipmentRate: onTimeShipmentRateTrend(purchaseOrders),
    poVolume: poVolumeTrend(purchaseOrders),
    inventoryInbound: movement.inbound,
    inventoryOutbound: movement.outbound,
  };

  const activity = await getRecentActivity(orgId, 8);

  return {
    products,
    suppliers,
    warehouses,
    health,
    alerts: allAlerts,
    recommendations,
    trends,
    activity,
    subscription,
  };
}
