import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCard } from "@/components/domain/alert-card";
import { RecommendationCard } from "@/components/domain/recommendation-card";
import { getSupplyChainHealth, getDashboardAlerts, getDashboardRecommendations } from "@/data/repositories/dashboard";
import { CheckCircle2 } from "lucide-react";

export default async function OverviewPage() {
  const [health, alerts, recommendations] = await Promise.all([
    getSupplyChainHealth(),
    getDashboardAlerts(),
    getDashboardRecommendations(),
  ]);

  return (
    <div>
      <PageHeader
        title="Good morning, Sarah."
        description="Here's what your Supply Chain Manager is watching right now."
      />

      <div className="space-y-8 p-8">
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Supply Chain Health" value={`${health.overall} / 100`} className="lg:col-span-1" />
          <MetricCard label="Inventory" value={`${health.inventory}`} />
          <MetricCard label="Suppliers" value={`${health.supplier}`} />
          <MetricCard label="Procurement" value={`${health.procurement}`} />
          <MetricCard label="Logistics" value={`${health.logistics}`} />
          <MetricCard label="Warehouses" value={`${health.warehouse}`} />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <SectionHeader
              title="Needs Attention"
              description={`${alerts.length} open alert${alerts.length === 1 ? "" : "s"}`}
            />
            {alerts.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={18} />}
                title="Nothing needs attention."
                description="Your supply chain is operating within healthy ranges."
              />
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <SectionHeader
              title="Recommended Actions"
              description={`${recommendations.length} recommendation${recommendations.length === 1 ? "" : "s"}`}
            />
            {recommendations.length === 0 ? (
              <EmptyState title="No recommendations right now." />
            ) : (
              <div className="space-y-2">
                {recommendations.slice(0, 5).map((rec) => (
                  <RecommendationCard key={rec.id} recommendation={rec} />
                ))}
              </div>
            )}
          </div>
        </section>

        <p className="text-small text-(--color-text-muted)">
          This is a Session 1 preview wired to real calculated data. The full Digital Manager overview — recent
          activity, trends, and one-click actions — arrives in Session 2.
        </p>
      </div>
    </div>
  );
}
