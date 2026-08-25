import { ShieldCheck } from "lucide-react";
import { RecommendationCard } from "@/components/domain/recommendation-card";
import type { Recommendation } from "@/types/supply-chain";

const EVIDENCE_ROWS = [
  { label: "PO-1042", value: "6 days late" },
  { label: "PO-1051", value: "9 days late" },
  { label: "Delta Components OTIF", value: "94% → 71%" },
];

const EXAMPLE_RECOMMENDATION: Recommendation = {
  id: "example-co-0006",
  category: "reorder",
  priority: "high",
  title: "Pull forward the reorder on CO-0006",
  description: "Cover Delta's slipped lead time before it turns into a stockout.",
  estimatedImpact: "$14,200 exposure",
  createdAt: "2026-08-24T00:00:00Z",
};

export function AiSpotlight() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">How it reports to you</h2>
      </div>

      <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-(--color-brand)" />
        <p className="text-small text-(--color-text-secondary)">
          A human always approves. The AI Manager surfaces and explains the action — it never places
          an order or contacts a supplier on its own.
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) shadow-md">
        <div className="flex items-center gap-2 border-b border-(--color-border) bg-(--color-surface-secondary) px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-critical)" />
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-warning)" />
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-success)" />
          <span className="ml-3 text-caption text-(--color-text-muted)">AI Manager</span>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="ml-auto max-w-md rounded-lg rounded-tr-sm bg-(--color-brand-subtle) px-4 py-2.5 text-body text-(--color-brand-hover)">
            &quot;Why did our procurement score drop this week?&quot;
          </div>

          <div className="max-w-xl rounded-lg rounded-tl-sm bg-(--color-surface-secondary) px-4 py-2.5 text-body text-(--color-text-primary)">
            &quot;Two purchase orders from Delta Components landed 6 and 9 days late, pulling their
            OTIF from 94% to 71%. They supply 3 of your top-20 SKUs by volume.&quot;
          </div>

          <div className="overflow-x-auto rounded-lg border border-(--color-border)">
            <table className="w-full text-small">
              <caption className="sr-only">Evidence behind the procurement score drop</caption>
              <tbody>
                {EVIDENCE_ROWS.map((row, i) => (
                  <tr key={row.label} className={i > 0 ? "border-t border-(--color-border)" : undefined}>
                    <td className="px-4 py-2 font-medium text-(--color-text-primary)">{row.label}</td>
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
