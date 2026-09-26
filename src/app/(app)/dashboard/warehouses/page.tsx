import { PageHeader } from "@/components/ui/page-header";
import { DataImportEmptyState } from "@/components/domain/data-import-empty-state";
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

  const hasData = warehouses.length > 0;

  // Capacity and utilization cover only warehouses whose capacity is known —
  // an unknown capacity is never counted as some number. Units on hand is real
  // data for every warehouse.
  const known = healthRecords.filter((h) => h.capacityUnits !== null);
  const totalCapacity = known.length > 0 ? known.reduce((acc, h) => acc + (h.capacityUnits ?? 0), 0) : null;
  const knownOnHandUnits = known.reduce((acc, h) => acc + h.onHandUnits, 0);
  const onHandUnits = healthRecords.reduce((acc, h) => acc + h.onHandUnits, 0);
  const spaceUtilization = totalCapacity ? (knownOnHandUnits / totalCapacity) * 100 : null;

  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Locations, capacities, space utilization, and inventory health ratings."
        actions={<WarehousesActions />}
      />

      <div className="space-y-6 p-8">
        {!hasData ? (
          <DataImportEmptyState />
        ) : (
          <>
            <WarehousesSummaryCards
              health={health}
              totalCapacity={totalCapacity}
              onHandUnits={onHandUnits}
              spaceUtilization={spaceUtilization}
              knownCapacityCount={known.length}
              warehouseCount={healthRecords.length}
            />

            <WarehousesTable
              warehouses={warehouses}
              healthRecords={healthRecords}
            />
          </>
        )}
      </div>
    </div>
  );
}
