"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SeriesForecastResult } from "@/lib/forecasting/python-client";
import type { Product, Warehouse } from "@/types/supply-chain";
import { Search, ArrowUpDown, Info } from "lucide-react";

interface ForecastAccuracyTableProps {
  results: SeriesForecastResult[];
  products: Product[];
  warehouses: Warehouse[];
  selectedSegment?: string | null;
}

type SortKey = "sku" | "wape" | "bias" | "method" | "segment";

export function ForecastAccuracyTable({
  results,
  products,
  warehouses,
  selectedSegment,
}: ForecastAccuracyTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("wape");
  const [sortAsc, setSortAsc] = useState(true);

  const productMap = useMemo(() => new Map(products.map((p) => [p.sku, p])), [products]);
  const warehouseMap = useMemo(() => new Map(warehouses.map((w) => [String(w.id), w.code])), [warehouses]);

  // Filter series
  const filtered = useMemo(() => {
    return results.filter((r) => {
      const p = productMap.get(r.sku);
      const searchMatch =
        r.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.method_selected.toLowerCase().includes(searchTerm.toLowerCase());

      const segmentMatch = selectedSegment
        ? `${r.abc_class}${r.xyz_class}` === selectedSegment
        : true;

      return searchMatch && segmentMatch;
    });
  }, [results, searchTerm, selectedSegment, productMap]);

  // Sort series
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "sku") cmp = a.sku.localeCompare(b.sku);
      else if (sortKey === "wape") cmp = a.accuracy.wape - b.accuracy.wape;
      else if (sortKey === "bias") cmp = a.accuracy.bias - b.accuracy.bias;
      else if (sortKey === "method") cmp = a.method_selected.localeCompare(b.method_selected);
      else if (sortKey === "segment") cmp = `${a.abc_class}${a.xyz_class}`.localeCompare(`${b.abc_class}${b.xyz_class}`);
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-h3 font-semibold text-(--color-text-primary)">
            SKU Forecast Tournament & Policy Breakdown
          </h3>
          <p className="text-small text-(--color-text-muted)">
            Showing {sorted.length} of {results.length} time series evaluated by out-of-fold cross-validation.
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" size={16} />
          <input
            type="text"
            placeholder="Search SKU, product, model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-(--color-border) bg-(--color-surface) py-1.5 pl-9 pr-3 text-small text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-brand) focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-small">
          <thead>
            <tr className="border-b border-(--color-border) text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
              <th className="py-3 px-3 cursor-pointer" onClick={() => handleSort("sku")}>
                <span className="flex items-center gap-1">SKU / Product <ArrowUpDown size={12} /></span>
              </th>
              <th className="py-3 px-3">Warehouse</th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => handleSort("segment")}>
                <span className="flex items-center gap-1">Class <ArrowUpDown size={12} /></span>
              </th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => handleSort("method")}>
                <span className="flex items-center gap-1">Tournament Winner <ArrowUpDown size={12} /></span>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort("wape")}>
                <span className="flex items-center justify-end gap-1">WAPE <ArrowUpDown size={12} /></span>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort("bias")}>
                <span className="flex items-center justify-end gap-1">Net Bias <ArrowUpDown size={12} /></span>
              </th>
              <th className="py-3 px-3">Policy Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-(--color-text-muted)">
                  No matching SKU forecast series found.
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const product = productMap.get(row.sku);
                const whCode = warehouseMap.get(row.warehouse) || row.warehouse;
                const segment = `${row.abc_class}${row.xyz_class}`;

                return (
                  <tr key={`${row.sku}-${row.warehouse}`} className="hover:bg-(--color-surface-hover)/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-mono font-medium text-(--color-text-primary)">{row.sku}</div>
                      <div className="text-xs text-(--color-text-muted) truncate max-w-[200px]">
                        {product?.name || "Unknown Product"}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-xs text-(--color-text-secondary)">
                      {whCode}
                    </td>

                    <td className="py-3 px-3">
                      <Badge tone="brand" className="font-mono text-xs font-semibold">
                        {segment}
                      </Badge>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-(--color-text-primary)">{row.method_selected}</span>
                        <span title={row.method_reason} className="cursor-help text-(--color-text-muted)">
                          <Info size={13} />
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-medium">
                      <span className={cn(
                        row.accuracy.wape <= 0.25 ? "text-(--color-success)" : row.accuracy.wape <= 0.40 ? "text-(--color-warning)" : "text-(--color-critical)"
                      )}>
                        {(row.accuracy.wape * 100).toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-xs">
                      <span className={cn(
                        Math.abs(row.accuracy.bias) <= 1.0 ? "text-(--color-text-muted)" : row.accuracy.bias > 0 ? "text-(--color-brand)" : "text-(--color-warning)"
                      )}>
                        {row.accuracy.bias > 0 ? `+${row.accuracy.bias.toFixed(1)}` : row.accuracy.bias.toFixed(1)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-xs text-(--color-text-secondary) max-w-[280px]">
                      {row.policy_hint}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
