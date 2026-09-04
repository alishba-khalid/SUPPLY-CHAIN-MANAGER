import { PageHeader } from "@/components/ui/page-header";
import { ChartCard } from "@/components/ui/chart-card";
import { TrendChart } from "@/components/domain/trend-chart";
import { getPurchaseOrders } from "@/data/repositories/procurement";
import { getInventoryTransactions } from "@/data/repositories/inventory";
import {
  procurementSpendTrend,
  onTimeShipmentRateTrend,
  poVolumeTrend,
  inventoryMovementTrend,
} from "@/lib/metrics/trends";
import { requireOrgId } from "@/lib/auth";

export default async function AnalyticsPage() {
  const orgId = await requireOrgId();

  const [purchaseOrders, transactions] = await Promise.all([
    getPurchaseOrders(orgId),
    getInventoryTransactions(orgId),
  ]);

  // Compute Weekly Trend Datasets
  const spendData = procurementSpendTrend(purchaseOrders);
  const onTimeData = onTimeShipmentRateTrend(purchaseOrders);
  const volumeData = poVolumeTrend(purchaseOrders);
  const movementData = inventoryMovementTrend(transactions);

  const spendSeries = [
    { name: "Procurement Spend", color: "var(--color-brand, #3b82f6)", data: spendData },
  ];

  const onTimeSeries = [
    { name: "On-Time Rate", color: "var(--color-success, #10b981)", data: onTimeData },
  ];

  const volumeSeries = [
    { name: "Ordered Units", color: "#8b5cf6", data: volumeData },
  ];

  const movementSeries = [
    { name: "Inbound (IN)", color: "var(--color-success, #10b981)", data: movementData.inbound },
    { name: "Outbound (OUT)", color: "var(--color-critical, #ef4444)", data: movementData.outbound },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Historical trends across inventory movement, procurement spend, volume, and supplier reliability."
      />

      <div className="grid grid-cols-1 gap-6 p-8 md:grid-cols-2">
        <ChartCard
          title="Procurement Spend Trend"
          description="Weekly spend across received purchase orders (trailing 12 weeks)"
        >
          <TrendChart series={spendSeries} format="currency" />
        </ChartCard>

        <ChartCard
          title="On-Time Delivery Rate Trend"
          description="Weekly percentage of purchase orders received on or before their expected date"
        >
          <TrendChart series={onTimeSeries} format="percent" />
        </ChartCard>

        <ChartCard
          title="Purchase Order Volume Trend"
          description="Weekly quantity of items ordered in outbound purchasing sheets"
        >
          <TrendChart series={volumeSeries} format="units" />
        </ChartCard>

        <ChartCard
          title="Inventory Movement Trend"
          description="Weekly inbound (IN) vs outbound (OUT) stock movement transaction volumes"
        >
          <TrendChart series={movementSeries} format="units" />
        </ChartCard>
      </div>
    </div>
  );
}
