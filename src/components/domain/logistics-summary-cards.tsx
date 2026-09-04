import { MetricCard } from "@/components/ui/metric-card";

interface LogisticsSummaryCardsProps {
  health: number;
  pendingShipments: number;
  unitsInTransit: number;
  delayedShipments: number;
}

export function LogisticsSummaryCards({
  health,
  pendingShipments,
  unitsInTransit,
  delayedShipments,
}: LogisticsSummaryCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <MetricCard
        label="Logistics Health"
        value={`${health}%`}
        helpText="On-time delivery rate (90d window)"
      />
      <MetricCard
        label="Pending Shipments"
        value={pendingShipments.toString()}
        helpText="Open POs awaiting receipt"
      />
      <MetricCard
        label="Units in Transit"
        value={unitsInTransit.toLocaleString()}
        helpText="Total product quantity on the way"
      />
      <MetricCard
        label="Delayed Inbound POs"
        value={delayedShipments.toString()}
        helpText="Open POs past expected receipt date"
      />
    </section>
  );
}
