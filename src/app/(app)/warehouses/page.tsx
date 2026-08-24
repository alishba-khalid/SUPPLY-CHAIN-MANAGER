import { PageHeader } from "@/components/ui/page-header";
import { SessionPlaceholder } from "@/components/domain/session-placeholder";

export default function WarehousesPage() {
  return (
    <div>
      <PageHeader title="Warehouses" description="Capacity, utilization, and inventory issues by location." />
      <SessionPlaceholder
        session="Session 5"
        description="Per-warehouse capacity utilization and issue rate, using the warehouse health formula defined in docs/metrics.md."
      />
    </div>
  );
}
