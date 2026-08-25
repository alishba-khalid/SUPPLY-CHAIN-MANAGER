/**
 * Derives Recommendation records from the same alerts/insights everything
 * else reads. A recommendation is an alert plus a suggested next action.
 */
import type { Recommendation } from "@/types/supply-chain";
import { getInventoryInsights } from "@/data/repositories/inventory";
import { getAllSupplierPerformance, getSuppliers } from "@/data/repositories/suppliers";
import { getProducts } from "@/data/repositories/products";

export async function getRecommendations(): Promise<Recommendation[]> {
  const now = new Date().toISOString();
  const [insights, supplierPerf, products, suppliers] = await Promise.all([
    getInventoryInsights(),
    getAllSupplierPerformance(),
    getProducts(),
    getSuppliers(),
  ]);
  const productBySku = new Map(products.map((p) => [p.sku, p]));
  const supplierById = new Map(suppliers.map((s) => [s.supplierId, s]));

  const recommendations: Recommendation[] = [];

  const stockOutBySku = new Map<string, number[]>();
  for (const insight of insights) {
    if (insight.status !== "stock_out_risk") continue;
    const list = stockOutBySku.get(insight.sku) ?? [];
    list.push(insight.warehouseId);
    stockOutBySku.set(insight.sku, list);
  }
  for (const [sku, warehouseIds] of stockOutBySku) {
    const product = productBySku.get(sku);
    recommendations.push({
      id: `REC-REORDER-${sku}`,
      category: "reorder",
      priority: "critical",
      title: `Reorder ${sku}`,
      description: `${product?.name ?? "This SKU"} is at risk of stocking out across ${warehouseIds.length} warehouse${warehouseIds.length > 1 ? "s" : ""}.`,
      affectedSkus: [sku],
      createdAt: now,
    });
  }

  const overstockBySku = new Map<string, { warehouseIds: number[]; tiedUpValue: number }>();
  for (const insight of insights) {
    if (insight.status !== "overstock") continue;
    const product = productBySku.get(insight.sku);
    const excessUnits = insight.availableQuantity - insight.overstockThreshold;
    const tiedUpValue = Math.max(0, excessUnits) * (product?.unitCost ?? 0);
    const entry = overstockBySku.get(insight.sku) ?? { warehouseIds: [], tiedUpValue: 0 };
    entry.warehouseIds.push(insight.warehouseId);
    entry.tiedUpValue += tiedUpValue;
    overstockBySku.set(insight.sku, entry);
  }
  for (const [sku, { tiedUpValue }] of overstockBySku) {
    if (tiedUpValue < 500) continue; // not worth surfacing
    recommendations.push({
      id: `REC-REDUCE-${sku}`,
      category: "reduce_purchase",
      priority: tiedUpValue > 5000 ? "high" : "medium",
      title: `Reduce purchases of ${sku}`,
      description: `Approximately $${Math.round(tiedUpValue).toLocaleString()} is tied up in excess stock.`,
      affectedSkus: [sku],
      estimatedImpact: `$${Math.round(tiedUpValue).toLocaleString()} tied up`,
      createdAt: now,
    });
  }

  for (const perf of supplierPerf) {
    if (perf.otifPercent === null || perf.otifPercent >= 75) continue;
    const supplier = supplierById.get(perf.supplierId);
    recommendations.push({
      id: `REC-SUPPLIER-${perf.supplierId}`,
      category: "supplier_review",
      priority: perf.otifPercent < 60 ? "critical" : "high",
      title: `Review ${supplier?.name ?? perf.supplierId}`,
      description: `OTIF has fallen to ${perf.otifPercent}% over the trailing ${perf.windowDays} days.`,
      affectedSupplierId: perf.supplierId,
      estimatedImpact: `$${Math.round(perf.totalSpend).toLocaleString()} in affected spend`,
      createdAt: now,
    });
  }

  const priorityRank: Record<Recommendation["priority"], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}
