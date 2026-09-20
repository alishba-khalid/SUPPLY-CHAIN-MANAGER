import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LineChart, Sparkles, CheckCircle2 } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `Automated Demand Forecasting Software for Distributors | ${SITE_NAME}`;
const DESCRIPTION =
  "Eliminate stockouts and overstock with automated demand forecasting, time-phased stockout projections, and safety stock calculations.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/features/demand-forecasting` },
  robots: { index: true, follow: true },
};

export default function DemandForecastingPage() {
  return (
    <div className="py-16">
      <section className="mx-auto max-w-4xl px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-secondary) px-3 py-1 text-caption font-medium text-(--color-brand)">
          <LineChart size={14} />
          Feature Spotlight
        </span>
        <h1 className="mt-4 text-h1 text-(--color-text-primary)">
          Automated Demand Forecasting & Stockout Projections
        </h1>
        <p className="mt-4 text-body-lg text-(--color-text-secondary) max-w-2xl mx-auto">
          Know exactly when every SKU will hit its reorder point before stockouts impact your sales.
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

      <section className="mx-auto max-w-4xl px-6 mt-16 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6 space-y-3">
            <h3 className="text-h3 font-semibold text-(--color-text-primary)">Time-Phased Sawtooth Charts</h3>
            <p className="text-body text-(--color-text-secondary)">
              Scan projected inventory balance across safety stock, reorder points, and expected purchase order receipts.
            </p>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6 space-y-3">
            <h3 className="text-h3 font-semibold text-(--color-text-primary)">Dynamic Safety Stock</h3>
            <p className="text-body text-(--color-text-secondary)">
              Calculates safety stock based on supplier lead-time variance and historical demand volatility (XYZ classification).
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-(--color-surface-secondary) p-8 space-y-4">
          <h2 className="text-h2 text-(--color-text-primary)">Why Distributors Trust Our Forecasting Engine</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-(--color-brand) shrink-0 mt-1" size={18} />
              <p className="text-body text-(--color-text-primary)">Runs automatically on your historical sales and purchase order data.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-(--color-brand) shrink-0 mt-1" size={18} />
              <p className="text-body text-(--color-text-primary)">Multi-warehouse isolation: calculate distinct reorder signals per location.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-(--color-brand) shrink-0 mt-1" size={18} />
              <p className="text-body text-(--color-text-primary)">Cold-start fallback: works reliably even with limited history.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
