import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ForecastAccuracyClient } from "@/components/domain/forecast-accuracy-client";
import { getInventoryTransactions } from "@/data/repositories/inventory";
import { getProducts } from "@/data/repositories/products";
import { getWarehouses } from "@/data/repositories/warehouses";
import { getStoredForecast, getLastForecastComputedAt } from "@/data/repositories/forecasts";
import type { SeriesInput } from "@/lib/forecasting/python-client";
import { requireOrgId } from "@/lib/auth";
import { checkPageRateLimit } from "@/lib/rate-limit";
import { Clock } from "lucide-react";

export default async function ForecastAccuracyPage() {
  const orgId = await requireOrgId();

  const withinRateLimit = await checkPageRateLimit("forecast-accuracy");
  if (!withinRateLimit) {
    return (
      <div>
        <PageHeader title="Forecast Accuracy & Demand Planning" />
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

  const [transactions, products, warehouses] = await Promise.all([
    getInventoryTransactions(orgId),
    getProducts(orgId),
    getWarehouses(orgId),
  ]);

  const productMap = new Map(products.map((p) => [p.sku, p]));

  // Group outbound transactions by SKU + Warehouse
  const seriesMap: Record<string, { sku: string; warehouse: string; historyMap: Record<string, number> }> = {};

  for (const t of transactions) {
    if (t.direction !== "OUT") continue;
    const dateStr = new Date(t.date).toISOString().slice(0, 10);
    const key = `${t.sku}::${t.warehouseId}`;
    if (!seriesMap[key]) {
      seriesMap[key] = {
        sku: t.sku,
        warehouse: String(t.warehouseId),
        historyMap: {},
      };
    }
    seriesMap[key].historyMap[dateStr] = (seriesMap[key].historyMap[dateStr] || 0) + t.quantity;
  }

  // Format into SeriesInput list
  const seriesList: SeriesInput[] = Object.values(seriesMap).map((item) => {
    const prod = productMap.get(item.sku);
    const history = Object.entries(item.historyMap)
      .map(([date, qty]) => ({ date, qty }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      sku: item.sku,
      warehouse: item.warehouse,
      history,
      horizon_days: 28,
      unit_cost: prod?.unitCost || 10.0,
    };
  });

  // Read the last batch's stored results — no network call, no timeout.
  // Series without a stored row fall back individually (see getStoredForecast).
  const [forecastData, lastComputedAt] = await Promise.all([
    getStoredForecast(orgId, seriesList),
    getLastForecastComputedAt(orgId),
  ]);

  return (
    <div>
      <PageHeader
        title="Forecast Accuracy & Demand Planning"
        description="Classical time series model tournament, out-of-fold cross-validation, 80% prediction intervals, and 3×3 ABC/XYZ portfolio policy segmentation."
      />

      <ForecastAccuracyClient
        forecastData={forecastData}
        products={products}
        warehouses={warehouses}
        lastComputedAt={lastComputedAt ? lastComputedAt.toISOString() : null}
      />
    </div>
  );
}
