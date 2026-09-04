"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SeriesForecastResult } from "@/lib/forecasting/python-client";

interface ForecastAccuracyMatrixProps {
  results: SeriesForecastResult[];
  selectedSegment?: string | null;
  onSelectSegment?: (segment: string | null) => void;
}

const ABC_ROWS = [
  { id: "A", label: "A — High Value", desc: "Top 80% annual consumption" },
  { id: "B", label: "B — Medium Value", desc: "Next 15% annual consumption" },
  { id: "C", label: "C — Low Value", desc: "Bottom 5% annual consumption" },
];

const XYZ_COLS = [
  { id: "X", label: "X — Steady (CV ≤ 0.5)", desc: "High predictability" },
  { id: "Y", label: "Y — Volatile (0.5 < CV ≤ 1.0)", desc: "Seasonal / moderate" },
  { id: "Z", label: "Z — Erratic (CV > 1.0)", desc: "Intermittent / lumpy" },
];

const CELL_POLICY_SHORT: Record<string, string> = {
  AX: "Auto Replenish (Tight ROP)",
  AY: "Weekly Review + Buffer",
  AZ: "Active Planner Oversight",
  BX: "Auto ROP (Medium Buffer)",
  BY: "Exp Smoothing Buffer",
  BZ: "Croston / Min Stock",
  CX: "Periodic Bulk Reorder",
  CY: "Low Frequency Review",
  CZ: "Order-on-Demand (MTO)",
};

export function ForecastAccuracyMatrix({
  results,
  selectedSegment,
  onSelectSegment,
}: ForecastAccuracyMatrixProps) {
  // Count SKUs and calculate mean WAPE per cell
  const cellData: Record<string, { count: number; meanWape: number }> = {};
  for (const r of results) {
    const key = `${r.abc_class}${r.xyz_class}`;
    if (!cellData[key]) {
      cellData[key] = { count: 0, meanWape: 0 };
    }
    cellData[key].count += 1;
    cellData[key].meanWape += r.accuracy.wape;
  }

  for (const key in cellData) {
    if (cellData[key].count > 0) {
      cellData[key].meanWape /= cellData[key].count;
    }
  }

  const total = results.length;

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-h3 font-semibold text-(--color-text-primary)">
            3×3 ABC/XYZ Portfolio Segmentation Matrix
          </h3>
          <p className="text-small text-(--color-text-muted)">
            Cross-classifying consumption value (ABC) against demand variability (XYZ) to assign tailored replenishment policies.
          </p>
        </div>
        {selectedSegment && onSelectSegment && (
          <button
            onClick={() => onSelectSegment(null)}
            className="rounded-md border border-(--color-border) bg-(--color-surface-hover) px-2.5 py-1 text-xs font-medium text-(--color-text-secondary) hover:bg-(--color-border)"
          >
            Clear Segment Filter ({selectedSegment}) ✕
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[650px]">
          {/* Header Row (XYZ Columns) */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="flex items-end justify-center pb-2 text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
              Value \ Volatility
            </div>
            {XYZ_COLS.map((col) => (
              <div key={col.id} className="rounded-md bg-(--color-surface-hover) p-2 text-center">
                <div className="text-xs font-bold text-(--color-text-primary)">{col.label}</div>
                <div className="text-[11px] text-(--color-text-muted)">{col.desc}</div>
              </div>
            ))}
          </div>

          {/* Grid Rows (ABC) */}
          {ABC_ROWS.map((row) => (
            <div key={row.id} className="grid grid-cols-4 gap-2 mb-2">
              {/* Row Label */}
              <div className="flex flex-col justify-center rounded-md bg-(--color-surface-hover) p-2">
                <div className="text-xs font-bold text-(--color-text-primary)">{row.label}</div>
                <div className="text-[11px] text-(--color-text-muted)">{row.desc}</div>
              </div>

              {/* 3 Columns */}
              {XYZ_COLS.map((col) => {
                const cellKey = `${row.id}${col.id}`;
                const info = cellData[cellKey] || { count: 0, meanWape: 0 };
                const pct = total > 0 ? Math.round((info.count / total) * 100) : 0;
                const isSelected = selectedSegment === cellKey;
                const policy = CELL_POLICY_SHORT[cellKey] || "Standard Policy";

                return (
                  <div
                    key={cellKey}
                    onClick={() => onSelectSegment && onSelectSegment(isSelected ? null : cellKey)}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3.5 transition-all",
                      isSelected
                        ? "border-(--color-brand) bg-(--color-brand)/10 ring-2 ring-(--color-brand)"
                        : "border-(--color-border) bg-(--color-surface) hover:border-(--color-brand)/50 hover:bg-(--color-surface-hover)",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-(--color-brand)">
                        {cellKey}
                      </span>
                      <span className="text-[11px] text-(--color-text-muted)">
                        {info.count} SKUs ({pct}%)
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-medium text-(--color-text-primary)">
                      {policy}
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-(--color-text-muted)">
                      <span>Avg WAPE:</span>
                      <span className={cn("font-medium", info.meanWape <= 0.25 ? "text-(--color-success)" : "text-(--color-warning)")}>
                        {info.count > 0 ? `${(info.meanWape * 100).toFixed(1)}%` : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
