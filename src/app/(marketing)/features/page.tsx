import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { PageIntro } from "@/components/marketing/page-intro";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `Features for Distributors | ${SITE_NAME}`;
const DESCRIPTION =
  "Demand forecasting, reorder points and safety stock, 1-click suggested purchase orders, supplier OTIF scorecards and stockout projections across every warehouse.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/features` },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/features`, siteName: SITE_NAME, type: "website" },
};

const FEATURE_PAGES = [
  { href: "/features/demand-forecasting", title: "Demand forecasting", body: "Per-SKU model tournament, safety stock and reorder points." },
  { href: "/features/purchase-orders", title: "1-click suggested purchase orders", body: "Turn a reorder recommendation into a PO in one click." },
  { href: "/features/supplier-scorecards", title: "Supplier scorecards", body: "On-time-in-full rates and real versus contract lead times." },
];

export default function FeaturesPage() {
  return (
    <>
      <PageIntro title="Features" description={DESCRIPTION} />
      <FeaturesGrid />
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-h2 text-(--color-text-primary)">Look closer</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {FEATURE_PAGES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-xl border border-(--color-border) bg-(--color-surface) p-6 transition-colors hover:border-(--color-brand)"
            >
              <h3 className="text-h3 font-semibold text-(--color-text-primary)">{f.title}</h3>
              <p className="mt-2 text-body text-(--color-text-secondary)">{f.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-small font-medium text-(--color-brand)">
                Read more <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
