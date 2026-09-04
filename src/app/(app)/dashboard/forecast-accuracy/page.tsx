import { PageHeader } from "@/components/ui/page-header";
import { ForecastAccuracyClient } from "@/components/domain/forecast-accuracy-client";
import { getInventoryTransactions } from "@/data/repositories/inventory";
import { getProducts } from "@/data/repositories/products";
import { getWarehouses } from "@/data/repositories/warehouses";
import { getBatchDemandForecast, type SeriesInput } from "@/lib/forecasting/python-client";
import { requireOrgId } from "@/lib/auth";

export default async function ForecastAccuracyPage() {
  const orgId = await requireOrgId();

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

  // Call the forecasting client (which connects to Python service or falls back seamlessly)
  const forecastData = await getBatchDemandForecast(seriesList);

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
      />
    </div>
  );
}
