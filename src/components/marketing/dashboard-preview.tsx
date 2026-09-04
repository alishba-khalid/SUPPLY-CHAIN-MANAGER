import { MetricCard } from "@/components/ui/metric-card";
import { AlertCard } from "@/components/domain/alert-card";
import { RecommendationCard } from "@/components/domain/recommendation-card";
import type { Recommendation, SupplyChainAlert } from "@/types/supply-chain";
import { SITE_URL } from "@/lib/site-config";

const DISPLAY_HOST = SITE_URL.replace(/^https?:\/\//, "");

const EXAMPLE_ALERT: SupplyChainAlert = {
  id: "example-alt-inv-sku-1015",
  category: "inventory",
  severity: "critical",
  title: "SKU-1015 at NDC — 3 days of cover",
  description: "Below reorder point. Supplier lead time is 7 days.",
  sku: "SKU-1015",
  warehouseId: 1,
  teaser: "Growth plans would order 2,400 units from SUP-005 today — upgrade to generate this PO.",
  suggestedQuantity: 2400,
  estimatedCost: 18480,
  createdAt: "2026-08-24T00:00:00Z",
};

const EXAMPLE_RECOMMENDATION: Recommendation = {
  id: "example-rec-sku-1001",
  category: "reduce_purchase",
  priority: "high",
  title: "Reduce purchases of SKU-1001",
  description: "$41,529 tied up. Healthy range is ~35 days for current demand of 13.6 units/day.",
  affectedSkus: ["SKU-1001"],
  estimatedImpact: "$41,529 excess capital",
  createdAt: "2026-08-24T00:00:00Z",
};

/** An illustrative snapshot of the dashboard, framed like a browser window — showing a business where the manager caught critical stockout risk and excess capital. */
export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg">
      <div className="flex items-center gap-2 border-b border-(--color-border) bg-(--color-surface-secondary) px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-(--color-critical)" />
        <span className="h-2.5 w-2.5 rounded-full bg-(--color-warning)" />
        <span className="h-2.5 w-2.5 rounded-full bg-(--color-success)" />
        <span className="ml-3 truncate rounded-md bg-(--color-surface) px-3 py-0.5 text-caption font-mono text-(--color-text-secondary)">
          {DISPLAY_HOST}/dashboard/overview
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Supply Chain Health" value="54 / 100" />
          <MetricCard label="Inventory" value="6" />
          <MetricCard label="Suppliers" value="73" />
        </div>

        <div>
          <p className="mb-1.5 text-caption font-bold uppercase tracking-wider text-(--color-text-secondary)">
            Needs Attention (Urgent)
          </p>
          <AlertCard alert={EXAMPLE_ALERT} isStarter={false} />
        </div>

        <div>
          <p className="mb-1.5 text-caption font-bold uppercase tracking-wider text-(--color-text-secondary)">
            Recommended Actions
          </p>
          <RecommendationCard recommendation={EXAMPLE_RECOMMENDATION} />
        </div>
      </div>
    </div>
  );
}
