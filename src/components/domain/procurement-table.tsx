"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import type { PurchaseOrder, Product, Supplier } from "@/types/supply-chain";

interface ProcurementTableProps {
  purchaseOrders: PurchaseOrder[];
  products: Product[];
  suppliers: Supplier[];
}

export function ProcurementTable({ purchaseOrders, products, suppliers }: ProcurementTableProps) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const productMap = useMemo(() => new Map(products.map((p) => [p.sku, p])), [products]);
  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.supplierId, s])), [suppliers]);

  // Compute today's date in UTC (matching application dates)
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  const tableRows = useMemo(() => {
    return purchaseOrders.map((po) => {
      const product = productMap.get(po.sku);
      const supplier = supplierMap.get(po.supplierId);

      const totalValue = po.quantity * po.unitPrice;

      // Price variance calculation
      let priceVar: number | null = null;
      if (product && product.unitCost > 0) {
        priceVar = ((po.unitPrice - product.unitCost) / product.unitCost) * 100;
      }

      // Status determination
      let status: "received" | "delayed" | "pending" | "overdue" = "pending";
      let statusLabel = "Pending";
      
      if (po.receivedDate) {
        if (po.receivedDate <= po.expectedDate) {
          status = "received";
          statusLabel = "Received On Time";
        } else {
          status = "delayed";
          statusLabel = "Received Late";
        }
      } else {
        if (po.expectedDate < todayStr) {
          status = "overdue";
          statusLabel = "Overdue";
        } else {
          status = "pending";
          statusLabel = "Pending";
        }
      }

      return {
        ...po,
        productName: product?.name ?? "Unknown Product",
        supplierName: supplier?.name ?? "Unknown Supplier",
        totalValue,
        priceVar,
        status,
        statusLabel,
      };
    });
  }, [purchaseOrders, productMap, supplierMap, todayStr]);

  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      const matchesSearch =
        row.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        row.sku.toLowerCase().includes(search.toLowerCase()) ||
        row.productName.toLowerCase().includes(search.toLowerCase());

      const matchesSupplier = !supplierFilter || row.supplierId === supplierFilter;

      let matchesStatus = true;
      if (statusFilter === "received_on_time") {
        matchesStatus = row.status === "received" && !!row.receivedDate;
      } else if (statusFilter === "received_late") {
        matchesStatus = row.status === "delayed";
      } else if (statusFilter === "pending") {
        matchesStatus = row.status === "pending";
      } else if (statusFilter === "overdue") {
        matchesStatus = row.status === "overdue";
      }

      return matchesSearch && matchesSupplier && matchesStatus;
    });
  }, [tableRows, search, supplierFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO, SKU, product..."
            className="h-9 w-64 rounded-md border border-(--color-border) bg-(--color-surface) pl-8 pr-3 text-body text-(--color-text-primary) placeholder:text-(--color-text-muted)"
          />
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="h-9 rounded-md border border-(--color-border) bg-(--color-surface) px-3 text-body text-(--color-text-primary)"
        >
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.supplierId} value={s.supplierId}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-(--color-border) bg-(--color-surface) px-3 text-body text-(--color-text-primary)"
        >
          <option value="">All statuses</option>
          <option value="received_on_time">Received On Time</option>
          <option value="received_late">Received Late</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <EmptyState title="No purchase orders found." description="Try adjusting your filters or search query." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-(--color-border)">
          <table className="w-full min-w-max border-collapse text-body">
            <thead>
              <tr className="border-b border-(--color-border) bg-(--color-surface-secondary)">
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">PO Number</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Supplier</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Product</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Quantity</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Unit Price</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Total Value</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Order Date</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Expected Date</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Received Date</th>
                <th className="px-4 py-2.5 text-center text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Variance</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-(--color-border) last:border-b-0 hover:bg-(--color-surface-secondary)">
                  <td className="px-4 py-3 font-medium text-(--color-text-primary)">{row.poNumber}</td>
                  <td className="px-4 py-3 text-(--color-text-secondary)">{row.supplierName}</td>
                  <td className="px-4 py-3 text-(--color-text-secondary)">
                    <span className="font-semibold text-(--color-text-primary)">{row.sku}</span> - {row.productName}
                  </td>
                  <td className="px-4 py-3 text-right text-(--color-text-primary)">{row.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-(--color-text-primary)">
                    ${row.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-(--color-text-primary)">
                    ${row.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-(--color-text-secondary)">{row.orderDate}</td>
                  <td className="px-4 py-3 text-(--color-text-secondary)">{row.expectedDate}</td>
                  <td className="px-4 py-3 text-(--color-text-secondary)">{row.receivedDate ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {row.priceVar !== null ? (
                      row.priceVar > 0 ? (
                        <Badge tone="critical">+{row.priceVar.toFixed(1)}%</Badge>
                      ) : row.priceVar < 0 ? (
                        <Badge tone="success">{row.priceVar.toFixed(1)}%</Badge>
                      ) : (
                        <Badge tone="neutral">0.0%</Badge>
                      )
                    ) : (
                      <span className="text-(--color-text-muted)">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} label={row.statusLabel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
