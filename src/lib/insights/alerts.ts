/**
 * Derives SupplyChainAlert records from the same underlying data every
 * other module reads — there is no separate "alerts" dataset, so an alert
 * here always matches what the Inventory/Supplier/Logistics pages show.
 */
import type { SupplyChainAlert } from "@/types/supply-chain";
import { REFERENCE_DATE } from "@/data/mock/dates";
import { getInventoryInsights } from "@/data/repositories/inventory";
import { getAllSupplierPerformance } from "@/data/repositories/suppliers";
import { getShipments } from "@/data/repositories/shipments";

const NOW = `${REFERENCE_DATE}T00:00:00Z`;

export async function getAlerts(): Promise<SupplyChainAlert[]> {
  const [insights, supplierPerf, shipments] = await Promise.all([
    getInventoryInsights(),
    getAllSupplierPerformance(),
    getShipments(),
  ]);

  const alerts: SupplyChainAlert[] = [];

  for (const insight of insights) {
    if (insight.status === "stock_out_risk") {
      alerts.push({
        id: `ALT-INV-${insight.productId}-${insight.warehouseId}`,
        category: "inventory",
        severity: "critical",
        title: "Stock-out risk",
        description:
          insight.daysOfStock !== null
            ? `${insight.daysOfStock} days of stock remaining.`
            : "No available stock remaining.",
        productId: insight.productId,
        warehouseId: insight.warehouseId,
        createdAt: NOW,
      });
    } else if (insight.status === "overstock") {
      alerts.push({
        id: `ALT-INV-${insight.productId}-${insight.warehouseId}`,
        category: "inventory",
        severity: "warning",
        title: "Overstock",
        description: "Stock is above the healthy range for current demand.",
        productId: insight.productId,
        warehouseId: insight.warehouseId,
        createdAt: NOW,
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
        createdAt: NOW,
      });
    }
  }

  for (const shipment of shipments) {
    if (shipment.status !== "delayed") continue;
    alerts.push({
      id: `ALT-SHP-${shipment.id}`,
      category: "logistics",
      severity: "warning",
      title: "Shipment delayed",
      description: `${shipment.shipmentNumber} is delayed past its expected delivery date.`,
      warehouseId: shipment.destinationWarehouseId ?? shipment.originWarehouseId,
      createdAt: NOW,
    });
  }

  return alerts;
}
