import { PageHeader } from "@/components/ui/page-header";
import { SuppliersSummaryCards } from "@/components/domain/suppliers-summary-cards";
import { SuppliersTable } from "@/components/domain/suppliers-table";
import { SuppliersActions } from "@/components/domain/suppliers-actions";
import { getSuppliers, getAllSupplierPerformance, getSupplierHealthScore } from "@/data/repositories/suppliers";
import { requireOrgId } from "@/lib/auth";

export default async function SuppliersPage() {
  const orgId = await requireOrgId();

  const [suppliers, performances, health] = await Promise.all([
    getSuppliers(orgId),
    getAllSupplierPerformance(orgId),
    getSupplierHealthScore(orgId),
  ]);

  // Compute summary numbers
  const totalSuppliers = suppliers.length;
  const totalSpend = performances.reduce((acc, p) => acc + p.totalSpend, 0);

  const activeLeadTimes = performances
    .map((p) => p.averageLeadTimeDays)
    .filter((lt): lt is number => lt !== null);
  const avgLeadTime = activeLeadTimes.length
    ? Math.round((activeLeadTimes.reduce((a, b) => a + b, 0) / activeLeadTimes.length) * 10) / 10
    : null;

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Supplier scorecards, lead times, spend, and on-time-in-full (OTIF) reliability."
        actions={<SuppliersActions />}
      />

      <div className="space-y-6 p-8">
        <SuppliersSummaryCards
          health={health}
          totalSuppliers={totalSuppliers}
          totalSpend={totalSpend}
          avgLeadTime={avgLeadTime}
        />

        <SuppliersTable
          suppliers={suppliers}
          performances={performances}
        />
      </div>
    </div>
  );
}
