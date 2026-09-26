"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Warehouse } from "@/types/supply-chain";
import type { WarehouseHealth } from "@/data/repositories/warehouses";
import { knownCapacity } from "@/lib/metrics/warehouse";

interface WarehousesTableProps {
  warehouses: Warehouse[];
  healthRecords: WarehouseHealth[];
}

export function WarehousesTable({ warehouses, healthRecords }: WarehousesTableProps) {
  const [search, setSearch] = useState("");

  const healthMap = useMemo(() => {
    return new Map(healthRecords.map((h) => [h.warehouseId, h]));
  }, [healthRecords]);

  const tableRows = useMemo(() => {
    return warehouses.map((warehouse) => {
      const health = healthMap.get(warehouse.id);
      // Capacity-derived values stay null when capacity is unknown — shown as
      // "Unknown" / "—", never computed against a stand-in number.
      return {
        ...warehouse,
        capacityUnits: knownCapacity(warehouse.capacityUnits),
        onHandUnits: health?.onHandUnits ?? 0,
        utilizationPercent: health?.utilizationPercent ?? null,
        utilizationBand: health?.utilizationBand ?? null,
        issueRateScore: health?.issueRateScore ?? 100,
        healthScore: health?.healthScore ?? null,
      };
    });
  }, [warehouses, healthMap]);

  const filteredRows = useMemo(() => {
    return tableRows.filter(
      (row) =>
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.code.toLowerCase().includes(search.toLowerCase())
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
            placeholder="Search warehouse code or name..."
            className="h-9 w-64 rounded-md border border-(--color-border) bg-(--color-surface) pl-8 pr-3 text-body text-(--color-text-primary) placeholder:text-(--color-text-muted)"
          />
        </div>
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <EmptyState title="No warehouses found." description="Try adjusting your search query." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-(--color-border)">
          <table className="w-full min-w-max border-collapse text-body">
            <thead>
              <tr className="border-b border-(--color-border) bg-(--color-surface-secondary)">
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Code</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Name</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Capacity (Units)</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">On-Hand Units</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted) w-72">Space Utilization (Physical)</th>
                <th className="px-4 py-2.5 text-center text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Stock Health (% Issues)</th>
                <th className="px-4 py-2.5 text-center text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Health Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                // Color codes for utilization progress bar
                let utilBarColor = "bg-yellow-500"; // underutilized
                let utilBadgeTone: "success" | "warning" | "critical" = "warning";
                let utilLabel = `Space: ${row.utilizationBand}`;
                
                if (row.utilizationBand === "healthy") {
                  utilBarColor = "bg-emerald-500";
                  utilBadgeTone = "success";
                  utilLabel = "Space: healthy (70-90%)";
                } else if (row.utilizationBand === "risk") {
                  utilBarColor = "bg-red-500";
                  utilBadgeTone = "critical";
                  utilLabel = "Space: risk (>90%)";
                } else if (row.utilizationBand === "underutilized") {
                  utilBarColor = "bg-yellow-500";
                  utilBadgeTone = "warning";
                  utilLabel = "Space: underutilized (<70%)";
                }

                // Health Score tone
                let healthTone: "success" | "warning" | "critical" = "critical";
                if (row.healthScore !== null && row.healthScore >= 80) healthTone = "success";
                else if (row.healthScore !== null && row.healthScore >= 60) healthTone = "warning";

                const issuePercent = 100 - row.issueRateScore;

                return (
                  <tr key={row.id} className="border-b border-(--color-border) last:border-b-0 hover:bg-(--color-surface-secondary)">
                    <td className="px-4 py-3 font-semibold text-(--color-text-primary)">{row.code}</td>
                    <td className="px-4 py-3 text-(--color-text-primary) font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-right text-(--color-text-secondary)">
                      {row.capacityUnits === null ? <span className="text-(--color-text-muted)">Unknown</span> : row.capacityUnits.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-(--color-text-primary)">{row.onHandUnits.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {row.utilizationPercent === null ? (
                        <div className="w-64 text-caption text-(--color-text-muted)">— Set capacity to see utilization</div>
                      ) : (
                        <div className="space-y-1.5 w-64">
                          <div className="flex items-center justify-between text-caption font-medium">
                            <span className="text-(--color-text-primary)">{row.utilizationPercent.toFixed(1)}%</span>
                            <Badge tone={utilBadgeTone} className="py-0 px-1.5 text-[10px] leading-4">
                              {utilLabel}
                            </Badge>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-(--color-border) overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", utilBarColor)}
                              style={{ width: `${Math.min(100, row.utilizationPercent)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {issuePercent > 0 ? (
                        <Badge tone="warning">
                          {issuePercent.toFixed(0)}% SKUs with issues
                        </Badge>
                      ) : (
                        <Badge tone="success">
                          Healthy (0% issues)
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.healthScore === null ? (
                        <span className="text-(--color-text-muted)" title="Needs a known capacity">—</span>
                      ) : (
                        <Badge tone={healthTone} className="font-semibold text-body">
                          {row.healthScore} / 100
                        </Badge>
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
