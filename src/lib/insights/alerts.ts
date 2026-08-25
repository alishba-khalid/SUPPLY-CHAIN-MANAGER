/**
 * Derives SupplyChainAlert records from the same underlying data every
 * other module reads — there is no separate "alerts" dataset, so an alert
 * here always matches what the rest of the dashboard shows.
 */
import type { SupplyChainAlert } from "@/types/supply-chain";
import { getInventoryInsights } from "@/data/repositories/inventory";
import { getAllSupplierPerformance } from "@/data/repositories/suppliers";

export async function getAlerts(): Promise<SupplyChainAlert[]> {
  const now = new Date().toISOString();
  const [insights, supplierPerf] = await Promise.all([getInventoryInsights(), getAllSupplierPerformance()]);

  const alerts: SupplyChainAlert[] = [];

  for (const insight of insights) {
    if (insight.status === "stock_out_risk") {
      alerts.push({
        id: `ALT-INV-${insight.sku}-${insight.warehouseId}`,
        category: "inventory",
        severity: "critical",
        title: "Stock-out risk",
        description:
          insight.daysOfStock !== null
            ? `${insight.daysOfStock} days of stock remaining.`
            : "No available stock remaining.",
        sku: insight.sku,
        warehouseId: insight.warehouseId,
        createdAt: now,
      });
    } else if (insight.status === "overstock") {
      alerts.push({
        id: `ALT-INV-${insight.sku}-${insight.warehouseId}`,
        category: "inventory",
        severity: "warning",
        title: "Overstock",
        description: "Stock is above the healthy range for current demand.",
        sku: insight.sku,
        warehouseId: insight.warehouseId,
        createdAt: now,
      });
    }
  }

  for (const perf of supplierPerf) {
    if (perf.otifPercent !== null && perf.otifPercent < 80) {
      alerts.push({
        id: `ALT-SUP-${perf.supplierId}`,
        category: "supplier",
        severity: perf.otifPercent < 65 ? "critical" : "warning",
        title: "Supplier underperforming",
        description: `OTIF is ${perf.otifPercent}% over the trailing ${perf.windowDays} days.`,
        supplierId: perf.supplierId,
        createdAt: now,
      });
    }
  }

  return alerts;
}
