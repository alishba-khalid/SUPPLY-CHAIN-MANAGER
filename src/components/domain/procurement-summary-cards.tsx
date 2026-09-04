import { MetricCard } from "@/components/ui/metric-card";

interface ProcurementSummaryCardsProps {
  health: number;
  cycleTimeScore: number;
  priceStability: number;
  avgCycleTime: number | null;
}

export function ProcurementSummaryCards({
  health,
  cycleTimeScore,
  priceStability,
  avgCycleTime,
}: ProcurementSummaryCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <MetricCard
        label="Procurement Health"
        value={`${health} / 100`}
        helpText="Speed, cost stability, & supplier OTIF"
      />
      <MetricCard
        label="On-Time Delivery"
        value={`${cycleTimeScore}%`}
        helpText="POs received on or before expected date"
      />
      <MetricCard
        label="Price Stability"
        value={`${priceStability} / 100`}
        helpText="Paid unit price vs. baseline cost"
      />
      <MetricCard
        label="Avg PO Cycle Time"
        value={avgCycleTime !== null ? `${avgCycleTime} days` : "—"}
        helpText="Actual elapsed days from order to physical receipt"
      />
    </section>
  );
}
