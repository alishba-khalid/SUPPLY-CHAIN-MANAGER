import type { Metadata } from "next";
import { User } from "lucide-react";
import { SITE_NAME, SITE_URL, TAGLINE, CONTACT_EMAIL } from "@/lib/site-config";

const TITLE = `About | ${SITE_NAME}`;
const DESCRIPTION = `Why we built ${SITE_NAME} and who's behind it.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  robots: { index: true, follow: true },
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

      <div className="mt-14 border-t border-(--color-border) pt-10">
        <h2 className="text-h3 text-(--color-text-primary)">Founder</h2>
        <div className="mt-5 flex flex-col gap-5 rounded-lg border border-(--color-border) bg-(--color-surface) p-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-(--color-surface-secondary) text-(--color-text-muted)">
            <User size={32} />
          </div>
          <div className="space-y-2">
            <p className="text-body-lg font-semibold text-(--color-text-primary)">[PLACEHOLDER: Founder full name]</p>
            <p className="text-small font-medium text-(--color-text-muted)">[PLACEHOLDER: Title, e.g. Founder & CEO]</p>
            <p className="text-body text-(--color-text-secondary)">
              [PLACEHOLDER: a few sentences of real founder bio — background, why they started {SITE_NAME}, and any
              relevant operations/supply-chain experience. Replace this paragraph and the photo above with the real
              details.]
            </p>
          </div>
        </div>
        <p className="mt-4 rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-small text-(--color-text-muted)">
          [PLACEHOLDER: supply the founder&apos;s name, title, a real bio, and (optionally) a headshot image and a
          LinkedIn/contact link — nothing above is invented, only structured for you to fill in.]
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
