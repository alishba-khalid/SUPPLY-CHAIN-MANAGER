import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, TAGLINE, CONTACT_EMAIL } from "@/lib/site-config";

const TITLE = `About | ${SITE_NAME}`;
const DESCRIPTION = `Why we built ${SITE_NAME}.`;

// TODO: this page is unfinished — it's missing a Founder section pending
// real name/title/bio from the business owner. It's deliberately kept out
// of the footer nav and sitemap.ts, and noindex'd below, until that section
// is added back in. Do not link it or index it before then.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/about`,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-small font-medium uppercase tracking-wide text-(--color-text-muted)">About</p>
      <h1 className="mt-2 text-h1 text-(--color-text-primary)">{TAGLINE}</h1>

      <div className="mt-8 space-y-4 text-body text-(--color-text-secondary)">
        <p>
          {SITE_NAME} exists to answer one question distributors ask every morning without a good tool for it:
          &quot;what do I need to order today, and why?&quot; Instead of a planner building a pivot table from three
          disconnected spreadsheets, it reads inventory, supplier lead times, and purchase-order history across every
          warehouse and turns that into a daily health score and time-phased reorder, expedite, and transfer
          recommendations.
        </p>
        <p>
          We&apos;d rather be plain about what the product does and doesn&apos;t do yet than oversell it — the same
          engine that shows a stockout projection is the one that decides when to raise an alert, so the chart and
          the recommendation can&apos;t disagree with each other.
        </p>
      </div>

      <p className="mt-10 text-small text-(--color-text-muted)">
        Questions? Reach us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-(--color-brand) hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
