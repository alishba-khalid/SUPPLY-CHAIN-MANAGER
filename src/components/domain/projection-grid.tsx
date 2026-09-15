import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SawtoothChart } from "@/components/domain/sawtooth-chart";
import { cn } from "@/lib/utils";
import type { ProjectionGridEntry } from "@/app/(app)/dashboard/projections/page";

const VISIBLE_TILE_COUNT = 6;

const ACTION_STYLES: Record<string, string> = {
  expedite: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  transfer: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  reorder: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  covered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
};

const ACTION_LABELS: Record<string, string> = {
  expedite: "Expedite",
  transfer: "Transfer",
  reorder: "Reorder",
  covered: "Covered",
};

function ProjectionTile({ entry }: { entry: ProjectionGridEntry }) {
  const { projection, abcClass, xyzClass, daysUntilStockout } = entry;
  const state = projection.actionType ?? "covered";

  return (
    <Link
      href={`/dashboard/projections/${projection.sku}/${projection.warehouseId}`}
      className="block"
    >
      <Card className="p-4 transition-colors hover:border-(--color-border-hover) hover:shadow-md">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-body text-(--color-text-primary)">{projection.sku}</p>
            <p className="truncate text-caption text-(--color-text-muted)">
              {projection.warehouseCode} · {projection.productName}
            </p>
          </div>
          <span className={cn("shrink-0 rounded px-2 py-0.5 text-caption font-semibold", ACTION_STYLES[state])}>
            {ACTION_LABELS[state]}
          </span>
        </div>

        <SawtoothChart projection={projection} height={120} compact />

        <div className="mt-2 flex items-center justify-between text-caption text-(--color-text-secondary)">
          <span>
            {daysUntilStockout !== null
              ? `Stockout in ${daysUntilStockout}d`
              : `${projection.daysOfCoverCurrent?.toFixed(1) ?? "—"}d cover`}
          </span>
          <span className="text-(--color-text-muted)">
            {abcClass ?? "—"}/{xyzClass}
          </span>
        </div>
      </Card>
    </Link>
  );
}

export function ProjectionGrid({ entries, isGated }: { entries: ProjectionGridEntry[]; isGated: boolean }) {
  if (entries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-body text-(--color-text-secondary)">No SKUs match these filters.</p>
      </Card>
    );
  }

  const visible = isGated ? entries.slice(0, VISIBLE_TILE_COUNT) : entries;
  const hidden = isGated ? entries.slice(VISIBLE_TILE_COUNT) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((entry) => (
          <ProjectionTile key={`${entry.projection.sku}-${entry.projection.warehouseId}`} entry={entry} />
        ))}
      </div>

      {hidden.length > 0 && (
        <div className="relative">
          <div className="pointer-events-none grid grid-cols-1 gap-4 blur-sm select-none sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {hidden.map((entry) => (
              <ProjectionTile key={`${entry.projection.sku}-${entry.projection.warehouseId}-hidden`} entry={entry} />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-(--color-surface)/60">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface) p-6 text-center shadow-lg">
              <Sparkles size={20} className="text-amber-500" />
              <p className="max-w-xs text-small text-(--color-text-secondary)">
                {hidden.length} more SKU{hidden.length === 1 ? "" : "s"} projected — the full catalogue grid is a
                Professional feature.
              </p>
              <Link
                href="/dashboard/settings?tab=billing"
                className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-brand) px-3 py-1.5 text-caption font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Upgrade to Professional <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
