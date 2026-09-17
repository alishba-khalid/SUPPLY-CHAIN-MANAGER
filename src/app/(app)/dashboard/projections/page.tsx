import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ForecastModeBadge } from "@/components/domain/forecast-mode-badge";
import { ProjectionFilters } from "@/components/domain/projection-filters";
import { ProjectionGrid } from "@/components/domain/projection-grid";
import {
  getInventoryInsights,
  getInventoryRecords,
  getInventoryTransactions,
  getInventoryTable,
} from "@/data/repositories/inventory";
import { getProducts } from "@/data/repositories/products";
import { getWarehouses } from "@/data/repositories/warehouses";
import { getSuppliers } from "@/data/repositories/suppliers";
import { getPurchaseOrders } from "@/data/repositories/procurement";
import { getOrgSubscription } from "@/data/repositories/subscription";
import { getAllSkuWarehouseProjections, type SkuWarehouseProjection } from "@/lib/forecasting/demand-forecast";
import { buildSeriesInputs } from "@/lib/forecasting/python-client";
import { getStoredForecast } from "@/data/repositories/forecasts";
import { classifyDemandVariability, type DemandVariabilityClass } from "@/lib/metrics/inventory";
import { requireOrgId } from "@/lib/auth";
import { checkPageRateLimit } from "@/lib/rate-limit";
import { Waves, Clock } from "lucide-react";

export interface ProjectionGridEntry {
  projection: SkuWarehouseProjection;
  abcClass: "A" | "B" | "C" | null;
  xyzClass: DemandVariabilityClass;
  /** Days until the projection first crosses zero — the worst-first sort key. Null = never within horizon. */
  daysUntilStockout: number | null;
}

const ACTION_FILTERS = ["expedite", "transfer", "reorder", "covered"] as const;

function daysBetweenISO(a: string, b: string): number {
  const d1 = new Date(a + "T00:00:00Z").getTime();
  const d2 = new Date(b + "T00:00:00Z").getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export default async function ProjectionsGridPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const orgId = await requireOrgId();

  const withinRateLimit = await checkPageRateLimit("projections-grid");
  if (!withinRateLimit) {
    return (
      <div>
        <PageHeader title="Stockout Projections" />
        <div className="p-8">
          <EmptyState
            icon={<Clock size={18} />}
            title="Too many requests"
            description="This page is rate-limited to protect the underlying forecasting service. Please wait a few minutes and try again."
          />
        </div>
      </div>
    );
  }

  const raw = await searchParams;
  const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

  const warehouseIdParam = one(raw.warehouseId);
  const supplierIdParam = one(raw.supplierId);
  const abcClassParam = one(raw.abcClass);
  const xyzClassParam = one(raw.xyzClass);
  const actionParam = one(raw.action);

  const [insights, records, products, warehouses, suppliers, purchaseOrders, transactions, inventoryTable, subscription] =
    await Promise.all([
      getInventoryInsights(orgId),
      getInventoryRecords(orgId),
      getProducts(orgId),
      getWarehouses(orgId),
      getSuppliers(orgId),
      getPurchaseOrders(orgId),
      getInventoryTransactions(orgId),
      getInventoryTable(orgId, { pageSize: 1000 }),
      getOrgSubscription(orgId),
    ]);

  const projections = getAllSkuWarehouseProjections({
    insights,
    records,
    products,
    suppliers,
    warehouses,
    purchaseOrders,
    transactions,
  });

  // Same shared demand math as every tile's chart — reads the nightly
  // batch's stored results (no network call), and supplies the batch's
  // real xyz_class per series where one is stored, instead of the local
  // CV estimate.
  const unitCostBySku = new Map(products.map((p) => [p.sku, p.unitCost]));
  const forecastData = await getStoredForecast(orgId, buildSeriesInputs(transactions, unitCostBySku));
  const liveXyzBySeries = new Map(
    forecastData.results.filter((r) => !r.is_fallback).map((r) => [`${r.sku}::${r.warehouse}`, r.xyz_class])
  );

  const abcBySeries = new Map(inventoryTable.rows.map((r) => [`${r.sku}::${r.warehouseId}`, r.abcClass]));

  const entries: ProjectionGridEntry[] = projections.map((projection) => {
    const key = `${projection.sku}::${projection.warehouseId}`;
    const xyzClass =
      liveXyzBySeries.get(key) ?? classifyDemandVariability(projection.dailyDemandSigma, projection.dailyDemand);
    const daysUntilStockout = projection.firstStockoutDate
      ? daysBetweenISO(projection.today, projection.firstStockoutDate)
      : null;

    return {
      projection,
      abcClass: abcBySeries.get(key) ?? null,
      xyzClass,
      daysUntilStockout,
    };
  });

  const filtered = entries.filter((e) => {
    if (warehouseIdParam && e.projection.warehouseId !== Number(warehouseIdParam)) return false;
    if (supplierIdParam && e.projection.supplierId !== supplierIdParam) return false;
    if (abcClassParam && e.abcClass !== abcClassParam) return false;
    if (xyzClassParam && e.xyzClass !== xyzClassParam) return false;
    if (actionParam && ACTION_FILTERS.includes(actionParam as (typeof ACTION_FILTERS)[number])) {
      const state = e.projection.actionType ?? "covered";
      if (state !== actionParam) return false;
    }
    return true;
  });

  // Worst first: an in-horizon stockout beats no stockout, earliest stockout wins ties;
  // among projections with no stockout, lowest current days-of-cover is more urgent.
  filtered.sort((a, b) => {
    if (a.daysUntilStockout !== null && b.daysUntilStockout !== null) {
      return a.daysUntilStockout - b.daysUntilStockout;
    }
    if (a.daysUntilStockout !== null) return -1;
    if (b.daysUntilStockout !== null) return 1;
    return (a.projection.daysOfCoverCurrent ?? Infinity) - (b.projection.daysOfCoverCurrent ?? Infinity);
  });

  const isProfessionalOrAbove = subscription.plan === "professional" || subscription.plan === "enterprise";

  return (
    <div>
      <PageHeader
        title="Stockout Projections"
        description="Every SKU's time-phased sawtooth — projected balance, reorder point, safety stock, and inbound POs — scanned at a glance."
      />

      <div className="space-y-6 p-8">
        {entries.length === 0 ? (
          <EmptyState
            icon={<Waves size={18} />}
            title="No inventory positions to project yet."
            description="Projections are computed from transaction history and open purchase orders — import that data to see this page come alive."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ForecastModeBadge liveCount={forecastData.liveCount} totalCount={forecastData.liveCount + forecastData.pendingCount} />
              <span className="text-caption text-(--color-text-muted)">
                {filtered.length} of {entries.length} SKU × warehouse positions
              </span>
            </div>

            <ProjectionFilters warehouses={warehouses} suppliers={suppliers} />

            <ProjectionGrid entries={filtered} isGated={!isProfessionalOrAbove} />
          </>
        )}
      </div>
    </div>
  );
}
