import Link from "next/link";
import { Check, X, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";
import type { CompetitorData } from "@/lib/competitors-data";
import { Accordion } from "@/components/ui/accordion";
import { SITE_NAME } from "@/lib/site-config";

export function CompetitorPage({ data }: { data: CompetitorData }) {
  return (
    <div className="py-16">
      {/* Hero Header */}
      <section className="mx-auto max-w-4xl px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-secondary) px-3 py-1 text-caption font-medium text-(--color-brand)">
          <Sparkles size={14} />
          Software Comparison
        </span>
        <h1 className="mt-4 text-h1 text-(--color-text-primary) tracking-tight">
          {SITE_NAME} vs {data.name}
        </h1>
        <p className="mt-4 text-body-lg text-(--color-text-secondary) max-w-2xl mx-auto">
          {data.tagline}
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-lg bg-(--color-brand) px-6 py-3 text-body font-semibold text-white hover:bg-(--color-brand-hover) transition-colors"
          >
            Start 14-Day Free Trial
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Summary Banner */}
      <section className="mx-auto max-w-4xl px-6 mt-12">
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-h2 text-(--color-text-primary)">Summary Overview</h2>
          <p className="text-body text-(--color-text-secondary) leading-relaxed">
            {data.summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-(--color-border)">
            <div className="rounded-lg bg-(--color-brand-subtle) p-4">
              <span className="text-caption font-semibold uppercase text-(--color-brand-hover)">
                {SITE_NAME} Pricing
              </span>
              <p className="mt-1 text-h3 font-bold text-(--color-text-primary)">{data.pricingSCM}</p>
            </div>
            <div className="rounded-lg bg-(--color-surface-secondary) p-4">
              <span className="text-caption font-semibold uppercase text-(--color-text-muted)">
                {data.name} Pricing
              </span>
              <p className="mt-1 text-h3 font-bold text-(--color-text-primary)">{data.pricingCompetitor}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Differences */}
      <section className="mx-auto max-w-4xl px-6 mt-16 space-y-6">
        <h2 className="text-h2 text-(--color-text-primary) text-center">Why Distributors Choose {SITE_NAME}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.keyDifferences.map((diff, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) p-4">
              <ShieldCheck className="text-(--color-brand) shrink-0 mt-1" size={20} />
              <p className="text-body text-(--color-text-primary) font-medium">{diff}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="mx-auto max-w-4xl px-6 mt-16 space-y-6">
        <div className="text-center">
          <h2 className="text-h2 text-(--color-text-primary)">Detailed Feature Breakdown</h2>
          <p className="mt-1 text-body text-(--color-text-secondary)">Side-by-side feature comparison.</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-(--color-border) bg-(--color-surface)">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-(--color-border) bg-(--color-surface-secondary)">
                <th className="p-4 text-body font-semibold text-(--color-text-primary)">Feature / Capability</th>
                <th className="p-4 text-body font-semibold text-(--color-brand) text-center">{SITE_NAME}</th>
                <th className="p-4 text-body font-semibold text-(--color-text-muted) text-center">{data.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-border)">
              {data.matrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-(--color-surface-secondary)/50">
                  <td className="p-4">
                    <p className="text-body font-medium text-(--color-text-primary)">{row.feature}</p>
                    {row.note && <p className="text-caption text-(--color-text-muted) mt-0.5">{row.note}</p>}
                  </td>
                  <td className="p-4 text-center">
                    {typeof row.scm === "boolean" ? (
                      row.scm ? <Check className="mx-auto text-(--color-brand)" size={20} /> : <X className="mx-auto text-(--color-text-muted)" size={20} />
                    ) : (
                      <span className="text-body font-semibold text-(--color-brand)">{row.scm}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {typeof row.competitor === "boolean" ? (
                      row.competitor ? <Check className="mx-auto text-(--color-text-muted)" size={20} /> : <X className="mx-auto text-(--color-text-muted)" size={20} />
                    ) : (
                      <span className="text-body text-(--color-text-muted)">{row.competitor}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      {data.faq.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 mt-16 space-y-6">
          <h2 className="text-h2 text-(--color-text-primary) text-center">Frequently Asked Questions</h2>
          <Accordion items={data.faq} />
        </section>
      )}

      {/* Bottom CTA */}
      <section className="mx-auto max-w-4xl px-6 mt-20 text-center">
        <div className="rounded-2xl bg-(--color-brand-subtle) border border-(--color-brand)/20 p-8 sm:p-12">
          <h2 className="text-h1 text-(--color-brand-hover)">Ready to switch to {SITE_NAME}?</h2>
          <p className="mt-3 text-body-lg text-(--color-text-secondary) max-w-lg mx-auto">
            Get your supply chain health score, stockout projections, and supplier OTIF scorecards in an afternoon.
          </p>
          <div className="mt-6">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-(--color-brand) px-8 py-3 text-body font-semibold text-white hover:bg-(--color-brand-hover) transition-colors"
            >
              Start Free 14-Day Trial
              <Zap size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
