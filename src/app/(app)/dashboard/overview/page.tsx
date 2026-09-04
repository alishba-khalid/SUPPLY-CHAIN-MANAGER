import { SectionHeader } from "@/components/ui/section-header";
import { MetricCard } from "@/components/ui/metric-card";
import { ChartCard } from "@/components/ui/chart-card";
import { EmptyState } from "@/components/ui/empty-state";
import { OverviewPanels } from "@/components/domain/overview-panels";
import { OverviewHeader } from "@/components/domain/overview-header";
import { TrendChart } from "@/components/domain/trend-chart";
import { ActivityItem } from "@/components/domain/activity-item";
import { LeadTimeWarningBanner } from "@/components/domain/lead-time-warning-banner";
import { getOverviewDashboardData } from "@/data/repositories/dashboard";
import { requireOrgId } from "@/lib/auth";
import { History } from "lucide-react";

export default async function OverviewPage() {
  const orgId = await requireOrgId();

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

  return (
    <div>
      <OverviewHeader userName="Sarah" />

      <div className="space-y-8 p-8">
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Supply Chain Health" value={`${health.overall} / 100`} className="lg:col-span-1" />
          <MetricCard label="Inventory" value={`${health.inventory}`} />
          <MetricCard label="Suppliers" value={`${health.supplier}`} />
          <MetricCard label="Procurement" value={`${health.procurement}`} />
          <MetricCard label="Logistics" value={`${health.logistics}`} />
          <MetricCard label="Warehouses" value={`${health.warehouse}`} />
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
      </div>
    </div>
  );
}
