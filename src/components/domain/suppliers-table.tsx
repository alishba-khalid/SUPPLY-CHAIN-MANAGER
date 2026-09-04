"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import type { Supplier, SupplierPerformance } from "@/types/supply-chain";

interface SuppliersTableProps {
  suppliers: Supplier[];
  performances: SupplierPerformance[];
}

export function SuppliersTable({ suppliers, performances }: SuppliersTableProps) {
  const [search, setSearch] = useState("");

  const performanceMap = useMemo(() => {
    return new Map(performances.map((p) => [p.supplierId, p]));
  }, [performances]);

  const tableRows = useMemo(() => {
    return suppliers.map((supplier) => {
      const perf = performanceMap.get(supplier.supplierId);
      return {
        ...supplier,
        eligiblePO: perf?.eligiblePurchaseOrders ?? 0,
        otif: perf?.otifPercent ?? null,
        otifCount: perf?.onTimeInFullCount ?? 0,
        actualLeadTime: perf?.averageLeadTimeDays ?? null,
        spend: perf?.totalSpend ?? 0,
      };
    });
  }, [suppliers, performanceMap]);

  const filteredRows = useMemo(() => {
    return tableRows.filter(
      (row) =>
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.supplierId.toLowerCase().includes(search.toLowerCase())
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
            placeholder="Search supplier name or ID..."
            className="h-9 w-64 rounded-md border border-(--color-border) bg-(--color-surface) pl-8 pr-3 text-body text-(--color-text-primary) placeholder:text-(--color-text-muted)"
          />
        </div>
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <EmptyState title="No suppliers found." description="Try adjusting your search query." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-(--color-border)">
          <table className="w-full min-w-max border-collapse text-body">
            <thead>
              <tr className="border-b border-(--color-border) bg-(--color-surface-secondary)">
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Supplier ID</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Name</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Email</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">POs (90d)</th>
                <th className="px-4 py-2.5 text-center text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">OTIF Rate</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Actual vs Contract Lead Time</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Spend (90d)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                let otifTone: "success" | "warning" | "critical" | "neutral" = "neutral";
                if (row.otif !== null) {
                  if (row.otif >= 90) otifTone = "success";
                  else if (row.otif >= 75) otifTone = "warning";
                  else otifTone = "critical";
                }

                // Lead time variance check
                const leadTimeVariance =
                  row.actualLeadTime !== null ? row.actualLeadTime - row.leadTimeDays : 0;

                return (
                  <tr key={row.id} className="border-b border-(--color-border) last:border-b-0 hover:bg-(--color-surface-secondary)">
                    <td className="px-4 py-3 font-semibold text-(--color-text-primary)">{row.supplierId}</td>
                    <td className="px-4 py-3 text-(--color-text-primary) font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-(--color-text-secondary)">{row.email}</td>
                    <td className="px-4 py-3 text-right text-(--color-text-primary)">{row.eligiblePO}</td>
                    <td className="px-4 py-3 text-center">
                      {row.otif !== null ? (
                        <div className="inline-flex items-center gap-2">
                          <Badge tone={otifTone}>{row.otif.toFixed(1)}%</Badge>
                          <span className="text-caption text-(--color-text-muted)">
                            ({row.otifCount}/{row.eligiblePO})
                          </span>
                        </div>
                      ) : (
                        <span className="text-(--color-text-muted)">No orders in window</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-(--color-text-secondary)">
                      {row.actualLeadTime !== null ? (
                        <div className="flex items-center gap-2">
                          <span>
                            <strong className="text-(--color-text-primary)">
                              {row.actualLeadTime.toFixed(1)} days
                            </strong>{" "}
                            avg
                          </span>
                          <span className="text-caption text-(--color-text-muted)">
                            (Contract: {row.leadTimeDays}d)
                          </span>
                          {leadTimeVariance > 1 && (
                            <Badge tone="critical">+{leadTimeVariance.toFixed(1)}d late</Badge>
                          )}
                        </div>
                      ) : (
                        <span>
                          Contract: <strong>{row.leadTimeDays} days</strong> (no active average)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-(--color-text-primary)">
                      ${row.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
