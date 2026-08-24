/**
 * Derives Recommendation records from the same alerts/insights everything
 * else reads. A recommendation is an alert plus a suggested next action.
 */
import type { Recommendation } from "@/types/supply-chain";
import { REFERENCE_DATE } from "@/data/mock/dates";
import { getInventoryInsights } from "@/data/repositories/inventory";
import { getAllSupplierPerformance, getSuppliers } from "@/data/repositories/suppliers";
import { getProducts } from "@/data/repositories/products";

const NOW = `${REFERENCE_DATE}T00:00:00Z`;

export async function getRecommendations(): Promise<Recommendation[]> {
  const [insights, supplierPerf, products, suppliers] = await Promise.all([
    getInventoryInsights(),
    getAllSupplierPerformance(),
    getProducts(),
    getSuppliers(),
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const recommendations: Recommendation[] = [];

  const stockOutByProduct = new Map<string, string[]>();
  for (const insight of insights) {
    if (insight.status !== "stock_out_risk") continue;
    const list = stockOutByProduct.get(insight.productId) ?? [];
    list.push(insight.warehouseId);
    stockOutByProduct.set(insight.productId, list);
  }
  for (const [productId, warehouseIds] of stockOutByProduct) {
    const product = productById.get(productId);
    recommendations.push({
      id: `REC-REORDER-${productId}`,
      category: "reorder",
      priority: "critical",
      title: `Reorder ${product?.sku ?? productId}`,
      description: `${product?.name ?? "This SKU"} is at risk of stocking out across ${warehouseIds.length} warehouse${warehouseIds.length > 1 ? "s" : ""}.`,
      affectedProductIds: [productId],
      createdAt: NOW,
    });
  }

  const overstockByProduct = new Map<string, { warehouseIds: string[]; tiedUpValue: number }>();
  for (const insight of insights) {
    if (insight.status !== "overstock") continue;
    const product = productById.get(insight.productId);
    const excessUnits = insight.availableQuantity - insight.overstockThreshold;
    const tiedUpValue = Math.max(0, excessUnits) * (product?.unitCost ?? 0);
    const entry = overstockByProduct.get(insight.productId) ?? { warehouseIds: [], tiedUpValue: 0 };
    entry.warehouseIds.push(insight.warehouseId);
    entry.tiedUpValue += tiedUpValue;
    overstockByProduct.set(insight.productId, entry);
  }
  for (const [productId, { tiedUpValue }] of overstockByProduct) {
    if (tiedUpValue < 500) continue; // not worth surfacing
    const product = productById.get(productId);
    recommendations.push({
      id: `REC-REDUCE-${productId}`,
      category: "reduce_purchase",
      priority: tiedUpValue > 5000 ? "high" : "medium",
      title: `Reduce purchases of ${product?.sku ?? productId}`,
      description: `Approximately $${Math.round(tiedUpValue).toLocaleString()} is tied up in excess stock.`,
      affectedProductIds: [productId],
      estimatedImpact: `$${Math.round(tiedUpValue).toLocaleString()} tied up`,
      createdAt: NOW,
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
      createdAt: NOW,
    });
  }

  const priorityRank: Record<Recommendation["priority"], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}
