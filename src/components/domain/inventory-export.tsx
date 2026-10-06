"use client";

import { ExportButton, type ExportColumn } from "@/components/ui/export-button";
import { exportInventoryAction, type InventoryExportFilters } from "@/app/actions/export";
import type { InventoryTableRow } from "@/types/supply-chain";

const STATUS_LABELS: Record<InventoryTableRow["status"], string> = {
  understock: "Understock",
  overstock: "Overstock",
  healthy: "Healthy",
  dead_stock: "Dead stock",
  unknown: "Unknown",
};

const round1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

const COLUMNS: ExportColumn<InventoryTableRow>[] = [
  { header: "SKU", value: (r) => r.sku },
  { header: "Product", value: (r) => r.productName },
  { header: "Category", value: (r) => r.category },
  { header: "Warehouse code", value: (r) => r.warehouseCode },
  { header: "Warehouse", value: (r) => r.warehouseName },
  { header: "Supplier ID", value: (r) => r.supplierId },
  { header: "Supplier", value: (r) => r.supplierName },
  { header: "Status", value: (r) => STATUS_LABELS[r.status] ?? r.status },
  { header: "ABC class", value: (r) => r.abcClass },
  { header: "On hand", value: (r) => r.quantityOnHand },
  { header: "Unit cost", value: (r) => r.unitCost },
  { header: "Units sold (90d)", value: (r) => r.unitsSold90d },
  { header: "Avg daily demand", value: (r) => round1(r.avgDailyDemand) },
  { header: "Days until stockout", value: (r) => round1(r.daysOfStock) },
  { header: "Lead time (days)", value: (r) => r.leadTimeDays },
  { header: "Safety stock", value: (r) => round1(r.safetyStock) },
  { header: "Reorder point", value: (r) => (r.reorderPoint === null ? null : Math.round(r.reorderPoint)) },
];

/** Exports every inventory row matching the current filters, not just this page. */
export function InventoryExport({ filters }: { filters: InventoryExportFilters }) {
  return (
    <ExportButton
      fileBase="inventory"
      sheetName="Inventory"
      columns={COLUMNS}
      loadRows={async () => {
        const { rows, truncated } = await exportInventoryAction(filters);
        if (truncated) console.warn(`[export] inventory export capped at ${rows.length.toLocaleString()} rows`);
        return rows;
      }}
    />
  );
}
