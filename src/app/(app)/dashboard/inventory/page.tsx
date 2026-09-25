import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataImportEmptyState } from "@/components/domain/data-import-empty-state";
import { InventorySummaryCards } from "@/components/domain/inventory-summary-cards";
import { LeadTimeWarningBanner } from "@/components/domain/lead-time-warning-banner";
import { InventoryFilters } from "@/components/domain/inventory-filters";
import { InventoryTable } from "@/components/domain/inventory-table";
import { InventoryPagination } from "@/components/domain/inventory-pagination";
import { InventoryActions } from "@/components/domain/inventory-actions";
import {
  getInventoryTable,
  getInventoryInsights,
  getInventoryRecords,
  getInventoryTransactions,
} from "@/data/repositories/inventory";
import { getProducts } from "@/data/repositories/products";
import { getWarehouses } from "@/data/repositories/warehouses";
import { getSuppliers } from "@/data/repositories/suppliers";
import { getPurchaseOrders } from "@/data/repositories/procurement";
import { getOrgSubscription } from "@/data/repositories/subscription";
import { generateSuggestedPurchaseOrders } from "@/lib/forecasting/demand-forecast";
import { SuggestedPosPanel } from "@/components/domain/suggested-pos-panel";
import { requireOrgId } from "@/lib/auth";
import type { InventoryRowStatus, InventoryTableSortKey } from "@/types/supply-chain";
import { PackageSearch } from "lucide-react";

const SORT_KEYS: InventoryTableSortKey[] = ["status", "sku", "name", "warehouse", "onHand", "daysOfStock", "reorderPoint"];
const STATUSES: InventoryRowStatus[] = ["understock", "overstock", "healthy", "dead_stock", "unknown"];
const PAGE_SIZE = 50;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const orgId = await requireOrgId();
  const raw = await searchParams;
  const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

  const warehouseIdParam = one(raw.warehouseId);
  const statusParam = one(raw.status);
  const abcClassParam = one(raw.abcClass);
  const supplierIdParam = one(raw.supplierId);
  const searchParam = one(raw.search);
  const sortKeyParam = one(raw.sortKey);
  const sortDirParam = one(raw.sortDir);
  const pageParam = one(raw.page);

  const warehouseId = warehouseIdParam ? Number(warehouseIdParam) : undefined;
  const status = STATUSES.includes(statusParam as InventoryRowStatus) ? (statusParam as InventoryRowStatus) : undefined;
  const abcClass = abcClassParam === "A" || abcClassParam === "B" || abcClassParam === "C" ? abcClassParam : undefined;
  const sortKey = SORT_KEYS.includes(sortKeyParam as InventoryTableSortKey) ? (sortKeyParam as InventoryTableSortKey) : "status";
  const sortDir = sortDirParam === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(pageParam) || 1);

  const [table, warehouses, suppliers, products, insights, records, purchaseOrders, transactions, subscription] = await Promise.all([
    getInventoryTable(orgId, {
      warehouseId,
      status,
      abcClass,
      supplierId: supplierIdParam,
      search: searchParam,
      sortKey,
      sortDir,
      page,
      pageSize: PAGE_SIZE,
    }),
    getWarehouses(orgId),
    getSuppliers(orgId),
    getProducts(orgId),
    getInventoryInsights(orgId),
    getInventoryRecords(orgId),
    getPurchaseOrders(orgId),
    getInventoryTransactions(orgId),
    getOrgSubscription(orgId),
  ]);

  const suggestions = generateSuggestedPurchaseOrders({
    insights,
    records,
    products,
    suppliers,
    warehouses,
    purchaseOrders,
    transactions,
  });

  const currentParams: Record<string, string | undefined> = {
    warehouseId: warehouseIdParam,
    status: statusParam,
    abcClass: abcClassParam,
    supplierId: supplierIdParam,
    search: searchParam,
    sortKey: sortKeyParam,
    sortDir: sortDirParam,
  };

  const hasData = products.length > 0 || table.rows.length > 0;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock health, demand, and reorder signals across every warehouse."
        actions={<InventoryActions warehouses={warehouses} suppliers={suppliers} />}
      />

      <div className="space-y-6 p-8">
        {!hasData ? (
          <DataImportEmptyState />
        ) : !table.hasAnyTransactionHistory ? (
          <EmptyState
            icon={<PackageSearch size={18} />}
            title="No transaction history yet."
            description="Inventory health, days until stockout, and reorder points are calculated from purchase order and transaction history — import that data to see this page come alive."
          />
        ) : (
          <>
            <LeadTimeWarningBanner suppliers={suppliers} />

            <InventorySummaryCards summary={table.summary} currentParams={currentParams} activeStatus={status} />

            {/* Suggested POs / Demand Forecasts (Core Growth Tier Engine) */}
            <SuggestedPosPanel
              suggestions={suggestions}
              isStarter={subscription.plan === "starter"}
              planId={subscription.plan}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <InventoryFilters warehouses={warehouses} suppliers={suppliers} />
            </div>

            <InventoryTable rows={table.rows} currentParams={currentParams} sortKey={sortKey} sortDir={sortDir} />

            <InventoryPagination page={page} pageSize={PAGE_SIZE} totalMatching={table.totalMatching} currentParams={currentParams} />
          </>
        )}
      </div>
    </div>
  );
}
