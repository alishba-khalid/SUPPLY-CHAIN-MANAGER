import { MetricCard } from "@/components/ui/metric-card";

interface WarehousesSummaryCardsProps {
  health: number;
  totalCapacity: number;
  onHandUnits: number;
  spaceUtilization: number;
}

export function WarehousesSummaryCards({
  health,
  totalCapacity,
  onHandUnits,
  spaceUtilization,
}: WarehousesSummaryCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <MetricCard
        label="Warehouse Health"
        value={`${health} / 100`}
        helpText="Blended utilization & issue rating"
      />
      <MetricCard
        label="Total Storage Capacity"
        value={totalCapacity.toLocaleString()}
        helpText="Combined capacity across locations"
      />
      <MetricCard
        label="Units On Hand"
        value={onHandUnits.toLocaleString()}
        helpText="Total stock units stored currently"
      />
      <MetricCard
        label="Space Utilization"
        value={`${spaceUtilization.toFixed(1)}%`}
        helpText="Units stored / storage capacity limit"
      />
    </section>
  );
}
