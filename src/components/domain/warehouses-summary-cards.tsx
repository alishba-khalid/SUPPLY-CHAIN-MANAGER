import { MetricCard } from "@/components/ui/metric-card";

interface WarehousesSummaryCardsProps {
  /** Null when no warehouse has a known capacity. */
  health: number | null;
  /** Sum over warehouses with a known capacity only; null if there are none. */
  totalCapacity: number | null;
  onHandUnits: number;
  /** Units at known-capacity warehouses / their capacity; null if there are none. */
  spaceUtilization: number | null;
  knownCapacityCount: number;
  warehouseCount: number;
}

export function WarehousesSummaryCards({
  health,
  totalCapacity,
  onHandUnits,
  spaceUtilization,
  knownCapacityCount,
  warehouseCount,
}: WarehousesSummaryCardsProps) {
  const unknownCount = warehouseCount - knownCapacityCount;
  // Say which warehouses a capacity-based figure covers whenever it isn't all of them.
  const coverage =
    unknownCount > 0 ? `${knownCapacityCount} of ${warehouseCount} warehouses; ${unknownCount} capacity unknown` : null;

  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <MetricCard
        label="Warehouse Health"
        value={health === null ? "—" : `${health} / 100`}
        helpText={coverage ?? "Blended utilization & issue rating"}
      />
      <MetricCard
        label="Total Storage Capacity"
        value={totalCapacity === null ? "Unknown" : totalCapacity.toLocaleString()}
        helpText={coverage ?? "Combined capacity across locations"}
      />
      <MetricCard
        label="Units On Hand"
        value={onHandUnits.toLocaleString()}
        helpText="Total stock units stored currently"
      />
      <MetricCard
        label="Space Utilization"
        value={spaceUtilization === null ? "—" : `${spaceUtilization.toFixed(1)}%`}
        helpText={coverage ?? "Units stored / storage capacity limit"}
      />
    </section>
  );
}
