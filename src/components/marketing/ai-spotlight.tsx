import { ShieldCheck } from "lucide-react";
import { RecommendationCard } from "@/components/domain/recommendation-card";
import type { Recommendation } from "@/types/supply-chain";
import { DEMO_ORG_ID } from "@/lib/auth";
import { getOpenPurchaseOrders } from "@/data/repositories/procurement";
import { getSupplierPerformance } from "@/data/repositories/suppliers";

const SPOTLIGHT_SUPPLIER_ID = "SUP-004";

function daysOverdue(expectedDate: string): number {
  const ms = Date.now() - new Date(expectedDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

const EXAMPLE_RECOMMENDATION: Recommendation = {
  id: "example-sku-1015",
  category: "reorder",
  priority: "high",
  title: "Pull forward reorder on SKU-1015 at NDC",
  description: "Cover supplier lead-time delay of 14 days before safety stock drops into stockout.",
  affectedSkus: ["SKU-1015"],
  affectedSupplierId: "SUP-004",
  affectedWarehouseId: 1,
  estimatedImpact: "Prevents $18,480 stockout risk",
  createdAt: "2026-08-24T00:00:00Z",
};

export async function AiSpotlight() {
  // Pulled live from the seeded demo dataset (org_demo) rather than
  // hardcoded — PO numbers and days-overdue drift as real time passes
  // against fixed expected dates, so a hardcoded snapshot goes stale.
  const [openPos, performance] = await Promise.all([
    getOpenPurchaseOrders(DEMO_ORG_ID),
    getSupplierPerformance(DEMO_ORG_ID, SPOTLIGHT_SUPPLIER_ID),
  ]);

  const overduePos = openPos
    .filter((po) => po.supplierId === SPOTLIGHT_SUPPLIER_ID && daysOverdue(po.expectedDate) > 0)
    .sort((a, b) => daysOverdue(b.expectedDate) - daysOverdue(a.expectedDate))
    .slice(0, 2);

  const evidenceRows = [
    ...overduePos.map((po) => ({
      label: `${po.poNumber} (${po.supplierId})`,
      value: `${daysOverdue(po.expectedDate)} days overdue`,
    })),
    {
      label: "Orion Electronics OTIF",
      value: `${performance.otifPercent ?? 0}% (trailing 90 days)`,
    },
  ];

  const overdueSummary =
    overduePos.length === 2
      ? `${daysOverdue(overduePos[0].expectedDate)} and ${daysOverdue(overduePos[1].expectedDate)} days overdue`
      : overduePos.length === 1
        ? `${daysOverdue(overduePos[0].expectedDate)} days overdue`
        : "overdue";

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">How it reports to you</h2>
        <p className="mt-3 text-body-lg text-(--color-text-secondary)">
          Ask plain-language questions and get grounded answers with direct database evidence.
        </p>
      </div>

      <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-(--color-brand)" />
        <p className="text-small font-medium text-(--color-text-primary)">
          A human always approves. The AI Manager surfaces and explains the action — it never places
          an order or contacts a supplier on its own.
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg">
        <div className="flex items-center gap-2 border-b border-(--color-border) bg-(--color-surface-secondary) px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-critical)" />
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-warning)" />
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-success)" />
          <span className="ml-3 text-caption font-mono text-(--color-text-secondary)">AI Manager Terminal</span>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="ml-auto max-w-md rounded-lg rounded-tr-sm bg-(--color-brand-subtle) px-4 py-2.5 text-body font-medium text-(--color-brand-hover)">
            &quot;Why did our procurement score drop this week?&quot;
          </div>

          <div className="max-w-xl rounded-lg rounded-tl-sm bg-(--color-surface-secondary) px-4 py-2.5 text-body text-(--color-text-primary)">
            &quot;Purchase orders from Orion Electronics (SUP-004) are {overdueSummary} with nothing received,
            depressing trailing 90-day OTIF to {performance.otifPercent ?? 0}%. They supply SKU-1009 and SKU-1015.&quot;
          </div>

          <div className="overflow-x-auto rounded-lg border border-(--color-border)">
            <table className="w-full text-small">
              <caption className="sr-only">Evidence behind the procurement score drop</caption>
              <tbody>
                {evidenceRows.map((row, i) => (
                  <tr key={row.label} className={i > 0 ? "border-t border-(--color-border)" : undefined}>
                    <td className="px-4 py-2 font-semibold text-(--color-text-primary)">{row.label}</td>
                    <td className="px-4 py-2 text-(--color-text-secondary)">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <RecommendationCard recommendation={EXAMPLE_RECOMMENDATION} />
        </div>
      </div>
    </section>
  );
}
