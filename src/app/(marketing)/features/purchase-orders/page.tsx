import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShoppingCart, CheckCircle2 } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `1-Click Suggested Purchase Orders Software | ${SITE_NAME}`;
const DESCRIPTION =
  "Generate suggested purchase orders automatically based on demand forecasts, safety stock, and supplier lead times.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/features/purchase-orders` },
  robots: { index: true, follow: true },
};

export default function PurchaseOrdersPage() {
  return (
    <div className="py-16">
      <section className="mx-auto max-w-4xl px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-secondary) px-3 py-1 text-caption font-medium text-(--color-brand)">
          <ShoppingCart size={14} />
          Procurement Automation
        </span>
        <h1 className="mt-4 text-h1 text-(--color-text-primary)">
          1-Click Suggested Purchase Orders
        </h1>
        <p className="mt-4 text-body-lg text-(--color-text-secondary) max-w-2xl mx-auto">
          Turn demand calculations into vendor purchase orders instantly.
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
            <h3 className="text-h3 font-semibold text-(--color-text-primary)">Automated Reorder Quantity</h3>
            <p className="text-body text-(--color-text-secondary)">
              Reorders exact quantities needed to maintain target days-of-cover without over-committing capital.
            </p>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6 space-y-3">
            <h3 className="text-h3 font-semibold text-(--color-text-primary)">Supplier Price Stability</h3>
            <p className="text-body text-(--color-text-secondary)">
              Tracks cost variance against baseline unit prices across all historical purchase orders.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-(--color-surface-secondary) p-8 space-y-4">
          <h2 className="text-h2 text-(--color-text-primary)">Streamlined Purchasing Workflow</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-(--color-brand) shrink-0 mt-1" size={18} />
              <p className="text-body text-(--color-text-primary)">Review and approve recommendations with full evidence charts.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-(--color-brand) shrink-0 mt-1" size={18} />
              <p className="text-body text-(--color-text-primary)">Prevent over-ordering and stockouts simultaneously.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
