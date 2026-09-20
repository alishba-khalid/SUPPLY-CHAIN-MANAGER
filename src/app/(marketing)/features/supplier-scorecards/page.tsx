import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Truck, CheckCircle2 } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `Supplier Performance & OTIF Scorecards | ${SITE_NAME}`;
const DESCRIPTION =
  "Track supplier lead-time delays, On-Time In-Full (OTIF) fulfillment rates, and spend-weighted reliability ratings.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/features/supplier-scorecards` },
  robots: { index: true, follow: true },
};

export default function SupplierScorecardsPage() {
  return (
    <div className="py-16">
      <section className="mx-auto max-w-4xl px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-secondary) px-3 py-1 text-caption font-medium text-(--color-brand)">
          <Truck size={14} />
          Supplier Analytics
        </span>
        <h1 className="mt-4 text-h1 text-(--color-text-primary)">
          Supplier Lead Time & OTIF Reliability Scorecards
        </h1>
        <p className="mt-4 text-body-lg text-(--color-text-secondary) max-w-2xl mx-auto">
          Identify late vendors before lead-time slippage causes stockout risks across your warehouse network.
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
            <h3 className="text-h3 font-semibold text-(--color-text-primary)">Spend-Weighted OTIF Rate</h3>
            <p className="text-body text-(--color-text-secondary)">
              Measures on-time-in-full delivery performance weighted by trailing 90-day spend.
            </p>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6 space-y-3">
            <h3 className="text-h3 font-semibold text-(--color-text-primary)">Automated Lead-Time Alerts</h3>
            <p className="text-body text-(--color-text-secondary)">
              Surfaces warning banners when supplier lead times trend upward, prompting pull-forward reorders.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-(--color-surface-secondary) p-8 space-y-4">
          <h2 className="text-h2 text-(--color-text-primary)">Key Benefits for Operations Managers</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-(--color-brand) shrink-0 mt-1" size={18} />
              <p className="text-body text-(--color-text-primary)">Hold suppliers accountable during contract negotiations with concrete delivery data.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-(--color-brand) shrink-0 mt-1" size={18} />
              <p className="text-body text-(--color-text-primary)">Prevent stockouts caused by hidden lead-time creep.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
