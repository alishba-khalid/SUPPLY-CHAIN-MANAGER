"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buildQueryString } from "@/lib/url-params";
import type { InventoryTableRow, InventoryTableSortKey } from "@/types/supply-chain";
import { cn } from "@/lib/utils";
import { explainDaysOfStock } from "@/lib/insights/explanations";
import { WhyPopover } from "./explanation-block";

const COLUMNS: { key: InventoryTableSortKey; header: string; align?: "right" }[] = [
  { key: "sku", header: "SKU" },
  { key: "name", header: "Name" },
  { key: "warehouse", header: "Warehouse" },
  { key: "onHand", header: "On hand", align: "right" },
  { key: "daysOfStock", header: "Days until stockout", align: "right" },
  { key: "reorderPoint", header: "Reorder point", align: "right" },
];

function formatUnits(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatDaysOfStock(v: number | null): string {
  if (v === null) return "No demand";
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} days`;
}

function formatReorderPoint(v: number | null): string {
  return v === null ? "—" : Math.round(v).toLocaleString();
}

export function InventoryTable({
  rows,
  currentParams,
  sortKey,
  sortDir,
}: {
  rows: InventoryTableRow[];
  currentParams: Record<string, string | undefined>;
  sortKey: InventoryTableSortKey;
  sortDir: "asc" | "desc";
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(rowId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  if (rows.length === 0) {
    return <EmptyState title="No SKUs match these filters." description="Try clearing a filter or the search box." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-(--color-border)">
      <table className="w-full min-w-max border-collapse text-body">
        <thead>
          <tr className="border-b border-(--color-border) bg-(--color-surface-secondary)">
            <th className="w-8 px-2 py-2.5" />
            {COLUMNS.map((col) => {
              const isActive = sortKey === col.key;
              const nextDir = isActive && sortDir === "asc" ? "desc" : "asc";
              const href = `?${buildQueryString(currentParams, { sortKey: col.key, sortDir: nextDir, page: undefined })}`;
              return (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-(--color-text-muted)",
                    col.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  <Link href={href} scroll={false} className="inline-flex items-center gap-1 hover:text-(--color-text-primary)">
                    {col.header}
                    {isActive ? (
                      sortDir === "asc" ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )
                    ) : (
                      <ChevronsUpDown size={12} className="opacity-50" />
                    )}
                  </Link>
                </th>
              );
            })}
            <th className="px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">Status</th>
            <th className="px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">ABC</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowId = `${row.sku}::${row.warehouseId}`;
            const isOpen = expanded.has(rowId);
            return (
              <Fragment key={rowId}>
                <tr
                  onClick={() => toggle(rowId)}
                  className="cursor-pointer border-b border-(--color-border) last:border-b-0 hover:bg-(--color-surface-secondary)"
                >
                  <td className="px-2 py-3 text-(--color-text-muted)">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td className="px-4 py-3 font-medium text-(--color-text-primary)">{row.sku}</td>
                  <td className="px-4 py-3 text-(--color-text-secondary)">{row.productName}</td>
                  <td className="px-4 py-3 text-(--color-text-secondary)">{row.warehouseCode}</td>
                  <td className="px-4 py-3 text-right text-(--color-text-primary)">{formatUnits(row.quantityOnHand)}</td>
                  <td className="px-4 py-3 text-right text-(--color-text-primary)">
                    <WhyPopover
                      label={`${row.sku} at ${row.warehouseCode}: ${formatDaysOfStock(row.daysOfStock)}`}
                      explanation={explainDaysOfStock({
                        onHand: row.quantityOnHand,
                        dailyDemand: row.avgDailyDemand,
                        daysOfStock: row.daysOfStock,
                        historyDays: row.daysOfHistory,
                        activeDays: row.activeDays,
                        totalSold: row.unitsSold90d,
                      })}
                    >
                      {formatDaysOfStock(row.daysOfStock)}
                    </WhyPopover>
                  </td>
                  <td className="px-4 py-3 text-right text-(--color-text-primary)">{formatReorderPoint(row.reorderPoint)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    {row.abcClass ? <Badge tone="neutral">{row.abcClass}</Badge> : <span className="text-(--color-text-muted)">—</span>}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-(--color-border) bg-(--color-surface-secondary) last:border-b-0">
                    <td colSpan={9} className="px-6 py-4">
                      <RowWorking row={row} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowWorking({ row }: { row: InventoryTableRow }) {
  const historyNote =
    row.daysOfHistory === 0
      ? "No transaction history for this SKU at this warehouse."
      : row.daysOfHistory < 90
        ? `Based on ${row.daysOfHistory} day${row.daysOfHistory === 1 ? "" : "s"} of history (less than the usual trailing 90).`
        : `Based on the full trailing 90 days of history.`;

  return (
    <div className="grid grid-cols-1 gap-4 text-small sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">Avg daily demand</p>
        <p className="mt-1 text-body text-(--color-text-primary)">
          {row.avgDailyDemand === null ? "No demand" : `${row.avgDailyDemand.toLocaleString(undefined, { maximumFractionDigits: 2 })} units/day`}
        </p>
        <p className="mt-0.5 text-(--color-text-muted)">{historyNote}</p>
      </div>
      <div>
        <p className="text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">Supplier lead time</p>
        <p className="mt-1 text-body text-(--color-text-primary)">
          {row.leadTimeDays === null ? "No lead time on record" : `${row.leadTimeDays} days`}
        </p>
        <p className="mt-0.5 text-(--color-text-muted)">
          {row.supplierName ?? (row.supplierId ? `Supplier ${row.supplierId} not found` : "No supplier on record")}
        </p>
      </div>
      <div>
        <p className="text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">Safety stock</p>
        <p className="mt-1 text-body text-(--color-text-primary)">
          {row.safetyStock === null ? "—" : Math.round(row.safetyStock).toLocaleString()}
        </p>
        {row.avgDailyDemand !== null && row.leadTimeDays !== null && (
          <p className="mt-0.5 text-(--color-text-muted)">
            {row.avgDailyDemand.toFixed(2)}/day × {row.leadTimeDays} days × 0.5
          </p>
        )}
      </div>
      <div>
        <p className="text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">Reorder point</p>
        <p className="mt-1 text-body text-(--color-text-primary)">{formatReorderPoint(row.reorderPoint)}</p>
        {row.reorderPoint !== null && row.avgDailyDemand !== null && row.leadTimeDays !== null && row.safetyStock !== null ? (
          <p className="mt-0.5 text-(--color-text-muted)">
            ({row.avgDailyDemand.toFixed(2)} × {row.leadTimeDays}) + {Math.round(row.safetyStock)} = {Math.round(row.reorderPoint)}
          </p>
        ) : (
          <p className="mt-0.5 text-(--color-text-muted)">Needs a supplier lead time to compute.</p>
        )}
      </div>
    </div>
  );
}
