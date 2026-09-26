import { MetricCard } from "@/components/ui/metric-card";

interface SuppliersSummaryCardsProps {
  /** Null when no supplier has on-time data in the last 90 days. */
  health: number | null;
  totalSuppliers: number;
  totalSpend: number;
  avgLeadTime: number | null;
}

export function SuppliersSummaryCards({
  health,
  totalSuppliers,
  totalSpend,
  avgLeadTime,
}: SuppliersSummaryCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <MetricCard
        label="Supplier Reliability"
        value={health === null ? "No data" : `${health} / 100`}
        helpText={health === null ? "No received or overdue POs in the last 90 days to score" : "Spend-weighted average OTIF score"}
      />
      <MetricCard
        label="Active Suppliers"
        value={totalSuppliers.toString()}
        helpText="Total vendors on record"
      />
      <MetricCard
        label="Total Spend (90d)"
        value={`$${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        helpText="Spend across trailing 90 days"
      />
      <MetricCard
        label="Contracted Lead Time"
        value={avgLeadTime !== null ? `${avgLeadTime} days` : "—"}
        helpText="Vendor catalog replenishment window"
      />
    </section>
  );
}
