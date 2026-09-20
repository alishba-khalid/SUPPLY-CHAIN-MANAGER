import { PageHeader } from "@/components/ui/page-header";
import { DataImportEmptyState } from "@/components/domain/data-import-empty-state";
import { LogisticsSummaryCards } from "@/components/domain/logistics-summary-cards";
import { LogisticsTable } from "@/components/domain/logistics-table";
import { LogisticsActions } from "@/components/domain/logistics-actions";
import { getOpenPurchaseOrders, getLogisticsHealthScore } from "@/data/repositories/procurement";
import { getProducts } from "@/data/repositories/products";
import { getSuppliers } from "@/data/repositories/suppliers";
import { getWarehouses } from "@/data/repositories/warehouses";
import { requireOrgId } from "@/lib/auth";

export default async function LogisticsPage() {
  const orgId = await requireOrgId();

  const [openPOs, health, products, suppliers, warehouses] = await Promise.all([
    getOpenPurchaseOrders(orgId),
    getLogisticsHealthScore(orgId),
    getProducts(orgId),
    getSuppliers(orgId),
    getWarehouses(orgId),
  ]);

  const hasData = openPOs.length > 0 || products.length > 0;

  // Compute summary values
  const pendingShipments = openPOs.length;
  const unitsInTransit = openPOs.reduce((acc, po) => acc + po.quantity, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delayedShipments = openPOs.filter((po) => {
    const expected = new Date(po.expectedDate);
    expected.setHours(0, 0, 0, 0);
    return expected.getTime() < today.getTime();
  }).length;

  return (
    <div>
      <PageHeader
        title="Logistics"
        description="Inbound deliveries, delayed shipments, and overall on-time logistics tracking performance."
        actions={<LogisticsActions openPOs={openPOs} warehouses={warehouses} />}
      />

      <div className="space-y-6 p-8">
        {!hasData ? (
          <DataImportEmptyState />
        ) : (
          <>
            <LogisticsSummaryCards
              health={health}
              pendingShipments={pendingShipments}
              unitsInTransit={unitsInTransit}
              delayedShipments={delayedShipments}
            />

            <LogisticsTable
              openPOs={openPOs}
              products={products}
              suppliers={suppliers}
            />
          </>
        )}
      </div>
    </div>
  );
}
