import { MetricCard } from "@/components/ui/metric-card";
import { AlertCard } from "@/components/domain/alert-card";
import { RecommendationCard } from "@/components/domain/recommendation-card";
import { getSupplyChainHealth, getDashboardAlerts, getDashboardRecommendations } from "@/data/repositories/dashboard";
import { SITE_URL } from "@/lib/site-config";

const DISPLAY_HOST = SITE_URL.replace(/^https?:\/\//, "");

/** A real, live-data snapshot of the actual dashboard, framed like a browser window. Not a mockup or stock image. */
export async function DashboardPreview() {
  const [health, alerts, recommendations] = await Promise.all([
    getSupplyChainHealth(),
    getDashboardAlerts(),
    getDashboardRecommendations(),
  ]);

  const topAlert = alerts[0];
  const topRecommendation = recommendations[0];

  return (
    <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) shadow-md">
      <div className="flex items-center gap-2 border-b border-(--color-border) bg-(--color-surface-secondary) px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-(--color-critical)" />
        <span className="h-2.5 w-2.5 rounded-full bg-(--color-warning)" />
        <span className="h-2.5 w-2.5 rounded-full bg-(--color-success)" />
        <span className="ml-3 truncate rounded-md bg-(--color-surface) px-3 py-0.5 text-caption text-(--color-text-muted)">
          {DISPLAY_HOST}/dashboard/overview
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Supply Chain Health" value={`${health.overall} / 100`} />
          <MetricCard label="Inventory" value={`${health.inventory}`} />
          <MetricCard label="Suppliers" value={`${health.supplier}`} />
        </div>

        {topAlert && (
          <div>
            <p className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">
              Needs Attention
            </p>
            <AlertCard alert={topAlert} />
          </div>
        )}

        {topRecommendation && (
          <div>
            <p className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">
              Recommended Actions
            </p>
            <RecommendationCard recommendation={topRecommendation} />
          </div>
        )}
      </div>
    </div>
  );
}
