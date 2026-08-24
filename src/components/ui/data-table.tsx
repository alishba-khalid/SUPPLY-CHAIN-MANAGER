import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle = "No data yet.",
  emptyDescription,
  onRowClick,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-(--color-border)">
      <table className="w-full min-w-max border-collapse text-body">
        <thead>
          <tr className="border-b border-(--color-border) bg-(--color-surface-secondary)">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-(--color-text-muted)",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  col.align === undefined || col.align === "left" ? "text-left" : "",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-(--color-border) last:border-b-0",
                onRowClick && "cursor-pointer hover:bg-(--color-surface-secondary)",
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-(--color-text-primary)",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className,
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
