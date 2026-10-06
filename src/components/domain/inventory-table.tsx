"use client";

import { Fragment, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Columns3 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buildQueryString } from "@/lib/url-params";
import type { InventoryTableRow, InventoryTableSortKey } from "@/types/supply-chain";
import { cn } from "@/lib/utils";
import { useStoredValue } from "@/lib/use-stored-value";
import { explainDaysOfStock } from "@/lib/insights/explanations";
import { WhyPopover } from "./explanation-block";

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

const muted = <span className="text-(--color-text-muted)">—</span>;

interface ColumnDef {
  id: string;
  header: string;
  /** Present when the server can sort by this column. */
  sortKey?: InventoryTableSortKey;
  align?: "right";
  render: (row: InventoryTableRow) => ReactNode;
}

// SKU is always shown; every other column can be hidden from "Columns".
const COLUMNS: ColumnDef[] = [
  { id: "name", header: "Name", sortKey: "name", render: (r) => <span className="text-(--color-text-secondary)">{r.productName}</span> },
  { id: "category", header: "Category", render: (r) => <span className="text-(--color-text-secondary)">{r.category}</span> },
  { id: "warehouse", header: "Warehouse", sortKey: "warehouse", render: (r) => <span className="text-(--color-text-secondary)">{r.warehouseCode}</span> },
  { id: "supplier", header: "Supplier", render: (r) => r.supplierName ?? r.supplierId ?? muted },
  { id: "onHand", header: "On hand", sortKey: "onHand", align: "right", render: (r) => formatUnits(r.quantityOnHand) },
  {
    id: "dailyDemand",
    header: "Avg daily demand",
    align: "right",
    render: (r) => (r.avgDailyDemand === null ? "No demand" : r.avgDailyDemand.toLocaleString(undefined, { maximumFractionDigits: 2 })),
  },
  { id: "sold90", header: "Sold (90d)", align: "right", render: (r) => formatUnits(r.unitsSold90d) },
  {
    id: "daysOfStock",
    header: "Days until stockout",
    sortKey: "daysOfStock",
    align: "right",
    render: (r) => (
      <WhyPopover
        label={`${r.sku} at ${r.warehouseCode}: ${formatDaysOfStock(r.daysOfStock)}`}
        explanation={explainDaysOfStock({
          onHand: r.quantityOnHand,
          dailyDemand: r.avgDailyDemand,
          daysOfStock: r.daysOfStock,
          historyDays: r.daysOfHistory,
          activeDays: r.activeDays,
          totalSold: r.unitsSold90d,
        })}
      >
        {formatDaysOfStock(r.daysOfStock)}
      </WhyPopover>
    ),
  },
  { id: "reorderPoint", header: "Reorder point", sortKey: "reorderPoint", align: "right", render: (r) => formatReorderPoint(r.reorderPoint) },
  {
    id: "unitCost",
    header: "Unit cost",
    align: "right",
    render: (r) => `$${r.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  { id: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  { id: "abc", header: "ABC", render: (r) => (r.abcClass ? <Badge tone="neutral">{r.abcClass}</Badge> : muted) },
];

// Module-level so the stored-value hook gets a stable fallback.
const DEFAULT_COLUMNS: string[] = ["name", "warehouse", "onHand", "daysOfStock", "reorderPoint", "status", "abc"];

function ColumnPicker({ visible, onChange }: { visible: string[]; onChange: (next: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggleColumn = (id: string) =>
    onChange(visible.includes(id) ? visible.filter((c) => c !== id) : [...visible, id]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface) px-3 text-small font-medium text-(--color-text-primary) hover:bg-(--color-surface-secondary)"
      >
        <Columns3 size={14} />
        Columns
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-(--color-border) bg-(--color-surface) p-2 shadow-lg">
          {COLUMNS.map((col) => (
            <label
              key={col.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-small text-(--color-text-primary) hover:bg-(--color-surface-secondary)"
            >
              <input type="checkbox" checked={visible.includes(col.id)} onChange={() => toggleColumn(col.id)} />
              {col.header}
            </label>
          ))}
          <button
            type="button"
            onClick={() => onChange(DEFAULT_COLUMNS)}
            className="mt-1 w-full rounded px-2 py-1.5 text-left text-caption text-(--color-brand) hover:bg-(--color-surface-secondary)"
          >
            Reset to default
          </button>
        </div>
      )}
    </div>
  );
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
  const [visibleIds, setVisibleIds] = useStoredValue<string[]>("scm.inventory.columns", DEFAULT_COLUMNS);
  const columns = COLUMNS.filter((c) => visibleIds.includes(c.id));

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

  const sortHeader = (key: InventoryTableSortKey, label: string) => {
    const isActive = sortKey === key;
    const nextDir = isActive && sortDir === "asc" ? "desc" : "asc";
    const href = `?${buildQueryString(currentParams, { sortKey: key, sortDir: nextDir, page: undefined })}`;
    return (
      <Link href={href} scroll={false} className="inline-flex items-center gap-1 hover:text-(--color-text-primary)">
        {label}
        {isActive ? (
          sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ChevronsUpDown size={12} className="opacity-50" />
        )}
      </Link>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ColumnPicker visible={visibleIds} onChange={setVisibleIds} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-(--color-border)">
        <table className="w-full min-w-max border-collapse text-body">
          <thead>
            <tr className="border-b border-(--color-border) bg-(--color-surface-secondary)">
              <th className="w-8 px-2 py-2.5" />
              <th className="px-4 py-2.5 text-left text-caption font-medium uppercase tracking-wide text-(--color-text-muted)">
                {sortHeader("sku", "SKU")}
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    "px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-(--color-text-muted)",
                    col.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {col.sortKey ? sortHeader(col.sortKey, col.header) : col.header}
                </th>
              ))}
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
                    {columns.map((col) => (
                      <td key={col.id} className={cn("px-4 py-3 text-(--color-text-primary)", col.align === "right" && "text-right")}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-(--color-border) bg-(--color-surface-secondary) last:border-b-0">
                      <td colSpan={columns.length + 2} className="px-6 py-4">
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
