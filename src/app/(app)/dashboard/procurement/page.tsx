import { PageHeader } from "@/components/ui/page-header";
import { DataImportEmptyState } from "@/components/domain/data-import-empty-state";
import { ProcurementSummaryCards } from "@/components/domain/procurement-summary-cards";
import { ProcurementTable } from "@/components/domain/procurement-table";
import { ProcurementActions } from "@/components/domain/procurement-actions";
import { getPurchaseOrders } from "@/data/repositories/procurement";
import { getProducts } from "@/data/repositories/products";
import { getSuppliers } from "@/data/repositories/suppliers";
import { requireOrgId } from "@/lib/auth";
import {
  procurementHealthScore,
  procurementCycleTimeScore,
  procurementPriceStabilityScore,
  averagePoCycleTimeDays,
} from "@/lib/metrics/procurement";

export default async function ProcurementPage() {
  const orgId = await requireOrgId();

  const [purchaseOrders, products, suppliers] = await Promise.all([
    getPurchaseOrders(orgId),
    getProducts(orgId),
    getSuppliers(orgId),
  ]);

  const hasData = purchaseOrders.length > 0 || products.length > 0;

  // Compute metrics
  const baselineCost = new Map(products.map((p) => [p.sku, p.unitCost]));
  const health = procurementHealthScore(purchaseOrders, baselineCost);
  const cycleTimeScore = procurementCycleTimeScore(purchaseOrders);
  const priceStability = procurementPriceStabilityScore(purchaseOrders, baselineCost);
  const avgCycleTime = averagePoCycleTimeDays(purchaseOrders);

  return (
    <div>
      <PageHeader
        title="Procurement"
        description="Purchase orders, spend, and supplier price variance analysis."
        actions={<ProcurementActions suppliers={suppliers} products={products} />}
      />

      <div className="space-y-6 p-8">
        {!hasData ? (
          <DataImportEmptyState />
        ) : (
          <>
            <ProcurementSummaryCards
              health={health}
              cycleTimeScore={cycleTimeScore}
              priceStability={priceStability}
              avgCycleTime={avgCycleTime}
            />

            <ProcurementTable
              purchaseOrders={purchaseOrders}
              products={products}
              suppliers={suppliers}
            />
          </>
        )}
      </div>
    </div>
  );
}
