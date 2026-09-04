"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, AlertTriangle, Truck } from "lucide-react";
import type { PurchaseOrder, Product, Supplier } from "@/types/supply-chain";

interface LogisticsTableProps {
  openPOs: PurchaseOrder[];
  products: Product[];
  suppliers: Supplier[];
}

export function LogisticsTable({ openPOs, products, suppliers }: LogisticsTableProps) {
  const [search, setSearch] = useState("");

  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.sku, p]));
  }, [products]);

  const supplierMap = useMemo(() => {
    return new Map(suppliers.map((s) => [s.supplierId, s]));
  }, [suppliers]);

  const tableRows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return openPOs.map((po) => {
      const prod = productMap.get(po.sku);
      const supp = supplierMap.get(po.supplierId);
      const expected = new Date(po.expectedDate);
      expected.setHours(0, 0, 0, 0);

      const diffTime = expected.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isDelayed = diffDays < 0;

      return {
        ...po,
        productName: prod?.name ?? "Unknown Product",
        supplierName: supp?.name ?? "Unknown Supplier",
        daysDifference: diffDays,
        isDelayed,
      };
    });
  }, [openPOs, productMap, supplierMap]);

  const filteredRows = useMemo(() => {
    return tableRows.filter(
      (row) =>
        row.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        row.sku.toLowerCase().includes(search.toLowerCase()) ||
        row.productName.toLowerCase().includes(search.toLowerCase()) ||
        row.supplierName.toLowerCase().includes(search.toLowerCase())
    );
  }, [tableRows, search]);

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO, product SKU, or supplier..."
            className="h-9 w-72 rounded-md border border-(--color-border) bg-(--color-surface) pl-8 pr-3 text-body text-(--color-text-primary) placeholder:text-(--color-text-muted)"
          />
        </div>
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <EmptyState title="No active inbound shipments." description="All purchase orders have been received or search terms didn't match." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-(--color-border)">
          <table className="w-full min-w-max border-collapse text-body">
            <thead>
              <tr className="border-b border-(--color-border) bg-(--color-surface-secondary)">
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">PO Number</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Supplier</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Product</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Quantity</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Expected Date</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Tracking Status</th>
                <th className="px-4 py-2.5 text-center text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                return (
                  <tr key={row.id} className="border-b border-(--color-border) last:border-b-0 hover:bg-(--color-surface-secondary)">
                    <td className="px-4 py-3 font-semibold text-(--color-text-primary)">{row.poNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-(--color-text-primary) font-medium">{row.supplierName}</span>
                        <span className="text-caption text-(--color-text-muted)">{row.supplierId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-(--color-text-primary) font-medium">{row.productName}</span>
                        <span className="text-caption text-(--color-text-muted)">{row.sku}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-(--color-text-primary)">{row.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-(--color-text-primary)">{row.expectedDate}</td>
                    <td className="px-4 py-3">
                      {row.isDelayed ? (
                        <div className="flex items-center gap-1.5 text-red-500 font-medium">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>{Math.abs(row.daysDifference)} days overdue</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                          <Truck size={14} className="shrink-0" />
                          <span>
                            {row.daysDifference === 0
                              ? "Due today"
                              : `${row.daysDifference} days remaining`}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.isDelayed ? (
                        <Badge tone="critical">Delayed</Badge>
                      ) : (
                        <Badge tone="brand">In Transit</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
