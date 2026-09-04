import { PageHeader } from "@/components/ui/page-header";
import { WarehousesSummaryCards } from "@/components/domain/warehouses-summary-cards";
import { WarehousesTable } from "@/components/domain/warehouses-table";
import { WarehousesActions } from "@/components/domain/warehouses-actions";
import { getWarehouses, getAllWarehouseHealth, getWarehouseHealthScore } from "@/data/repositories/warehouses";
import { requireOrgId } from "@/lib/auth";

export default async function WarehousesPage() {
  const orgId = await requireOrgId();

  const [warehouses, healthRecords, health] = await Promise.all([
    getWarehouses(orgId),
    getAllWarehouseHealth(orgId),
    getWarehouseHealthScore(orgId),
  ]);

  // Compute summary values
  const totalCapacity = healthRecords.reduce((acc, h) => acc + h.capacityUnits, 0);
  const onHandUnits = healthRecords.reduce((acc, h) => acc + h.onHandUnits, 0);
  const spaceUtilization = totalCapacity > 0 ? (onHandUnits / totalCapacity) * 100 : 0;

  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Locations, capacities, space utilization, and inventory health ratings."
        actions={<WarehousesActions />}
      />

      <div className="space-y-6 p-8">
        <WarehousesSummaryCards
          health={health}
          totalCapacity={totalCapacity}
          onHandUnits={onHandUnits}
          spaceUtilization={spaceUtilization}
        />

        <WarehousesTable
          warehouses={warehouses}
          healthRecords={healthRecords}
        />
      </div>
    </div>
  );
}
