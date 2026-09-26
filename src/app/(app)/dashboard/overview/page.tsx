import { SectionHeader } from "@/components/ui/section-header";
import { MetricCard } from "@/components/ui/metric-card";
import { ChartCard } from "@/components/ui/chart-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DataImportEmptyState } from "@/components/domain/data-import-empty-state";
import { OverviewPanels } from "@/components/domain/overview-panels";
import { OverviewHeader } from "@/components/domain/overview-header";
import { TrendChart } from "@/components/domain/trend-chart";
import { ActivityItem } from "@/components/domain/activity-item";
import { LeadTimeWarningBanner } from "@/components/domain/lead-time-warning-banner";
import { getOverviewDashboardData } from "@/data/repositories/dashboard";
import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { healthScoreTone } from "@/lib/metrics/health";
import { History } from "lucide-react";
import { currentUser } from "@clerk/nextjs/server";

const HEALTH_TOOLTIPS = {
  overall:
    "Weighted average of the five category scores below: Inventory 30%, Suppliers 20%, Procurement 20%, Logistics 20%, Warehouses 10%.",
  inventory:
    "Average status score across every SKU x warehouse position: healthy=100, overstock=75, slow-moving=70, low stock=60, dead stock=40, stock-out risk=10.",
  supplier:
    "Spend-weighted average on-time-in-full (OTIF) delivery rate across all suppliers, weighted by each supplier's trailing 90-day spend.",
  procurement:
    "Weighted blend, trailing 90 days: PO fulfillment (OTIF) rate 40%, on-time cycle rate 30%, price stability vs. baseline cost 30%.",
  logistics:
    "Inbound purchase-order on-time delivery rate, trailing 90 days (this schema has no shipments table, so logistics reuses PO receipt timing).",
  warehouse:
    "Average across warehouses of capacity utilization score (50%, healthy at 70-90% of capacity) and inventory issue-rate score (50%, share of SKU positions in healthy status). Warehouses with unknown capacity are left out; shows — if none has a capacity set.",
} as const;

export default async function OverviewPage() {
  const orgId = await requireOrgId();
  const isDemo = isDemoOrg(orgId);
  const userName = isDemo ? "Demo Workspace" : (await currentUser())?.firstName ?? undefined;

  const {
    products,
    suppliers,
    warehouses,
    health,
    alerts,
    recommendations,
    trends,
    activity,
    subscription,
  } = await getOverviewDashboardData(orgId);

  const hasData = products.length > 0 || suppliers.length > 0 || warehouses.length > 0;

  return (
    <div>
      <OverviewHeader userName={userName} />

      <div className="space-y-8 p-8">
        {!hasData ? (
          <DataImportEmptyState />
        ) : (
          <>
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            label="Supply Chain Health"
            value={`${health.overall} / 100`}
            className="lg:col-span-1"
            tooltip={HEALTH_TOOLTIPS.overall}
            tone={healthScoreTone(health.overall)}
          />
          <MetricCard
            label="Inventory"
            value={`${health.inventory}`}
            tooltip={HEALTH_TOOLTIPS.inventory}
            tone={healthScoreTone(health.inventory)}
          />
          <MetricCard
            label="Suppliers"
            value={`${health.supplier}`}
            tooltip={HEALTH_TOOLTIPS.supplier}
            tone={healthScoreTone(health.supplier)}
          />
          <MetricCard
            label="Procurement"
            value={`${health.procurement}`}
            tooltip={HEALTH_TOOLTIPS.procurement}
            tone={healthScoreTone(health.procurement)}
          />
          <MetricCard
            label="Logistics"
            value={`${health.logistics}`}
            tooltip={HEALTH_TOOLTIPS.logistics}
            tone={healthScoreTone(health.logistics)}
          />
          <MetricCard
            label="Warehouses"
            value={health.warehouse === null ? "—" : `${health.warehouse}`}
            tooltip={HEALTH_TOOLTIPS.warehouse}
            tone={health.warehouse === null ? undefined : healthScoreTone(health.warehouse)}
          />
        </section>
 
        <LeadTimeWarningBanner suppliers={suppliers} />

        <OverviewPanels
          alerts={alerts}
          recommendations={recommendations}
          products={products}
          suppliers={suppliers}
          warehouses={warehouses}
          isStarter={subscription.plan === "starter"}
        />

        <section className="space-y-3">
          <SectionHeader title="Trends" description="Trailing 12 weeks, updated through today." />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Procurement Spend" description="Weekly spend across received purchase orders.">
              <TrendChart
                series={[{ name: "Spend", color: "var(--color-brand)", data: trends.procurementSpend }]}
                format="currency"
              />
            </ChartCard>
            <ChartCard title="On-Time Delivery Rate" description="% of received purchase orders arriving on or before expected.">
              <TrendChart
                series={[{ name: "On-time rate", color: "var(--color-info)", data: trends.onTimeShipmentRate }]}
                format="percent"
              />
            </ChartCard>
            <ChartCard title="Purchase Order Volume" description="Units ordered per week, across all purchase orders.">
              <TrendChart
                series={[{ name: "Units", color: "var(--color-brand)", data: trends.poVolume }]}
                format="units"
              />
            </ChartCard>
            <ChartCard title="Inventory Movement" description="Units received vs. units shipped out.">
              <TrendChart
                series={[
                  { name: "Inbound", color: "var(--color-brand)", data: trends.inventoryInbound },
                  { name: "Outbound", color: "var(--color-info)", data: trends.inventoryOutbound },
                ]}
                format="units"
              />
            </ChartCard>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Recent Activity" description="Notable events from the last 14 days." />
          {activity.length === 0 ? (
            <EmptyState icon={<History size={18} />} title="No recent activity." />
          ) : (
            <div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-4">
              {activity.map((event) => (
                <ActivityItem key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
          </>
        )}
      </div>
    </div>
  );
}
