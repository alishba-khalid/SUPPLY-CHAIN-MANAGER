import Link from "next/link";
import { MetricCard } from "@/components/ui/metric-card";
import { buildQueryString } from "@/lib/url-params";
import type { InventoryTableSummary } from "@/types/supply-chain";

/** Each card is a link that sets the status filter (and resets to page 1) — no client JS needed. */
export function InventorySummaryCards({
  summary,
  currentParams,
  activeStatus,
}: {
  summary: InventoryTableSummary;
  currentParams: Record<string, string | undefined>;
  activeStatus?: string;
}) {
  const cards = [
    {
      label: "Stock positions",
      value: summary.totalRows,
      status: undefined,
      helpText: "Across all warehouse facilities",
    },
    {
      label: "Understock",
      value: summary.understockCount,
      status: "understock",
      helpText: "Below safety stock or lead time",
    },
    {
      label: "Overstock",
      value: summary.overstockCount,
      status: "overstock",
      helpText: "Capital tied up above 30d cover",
    },
    {
      label: "Dead Stock",
      value: summary.deadStockCount,
      status: "dead_stock",
      helpText: "0 outbound movement in 90d",
    },
  ] as const;

  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => {
        const isActive = activeStatus === card.status || (card.status === undefined && !activeStatus);
        const href = `?${buildQueryString(currentParams, { status: card.status, page: undefined })}`;
        return (
          <Link key={card.label} href={href} scroll={false}>
            <MetricCard
              label={card.label}
              value={card.value.toLocaleString()}
              helpText={card.helpText}
              className={isActive ? "border-(--color-brand) ring-1 ring-(--color-brand)" : undefined}
            />
          </Link>
        );
      })}
    </section>
  );
}
