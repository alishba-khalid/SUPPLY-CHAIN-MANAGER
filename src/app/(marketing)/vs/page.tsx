import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageIntro } from "@/components/marketing/page-intro";
import { COMPETITORS, COMPETITORS_CHECKED } from "@/lib/competitors-data";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `Compare ${SITE_NAME} with Other Inventory Tools`;
const DESCRIPTION = `Side-by-side comparisons of ${SITE_NAME} with ten inventory and planning tools, using each vendor's own pricing and feature pages (checked ${COMPETITORS_CHECKED}).`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/vs` },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/vs`, siteName: SITE_NAME, type: "website" },
};

export default function CompareIndexPage() {
  const entries = Object.values(COMPETITORS);
  return (
    <>
      <PageIntro title="Compare inventory and planning tools" description={DESCRIPTION} />
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <p className="max-w-3xl text-body text-(--color-text-secondary)">
          Every comparison uses only what the other vendor&apos;s own website states, dated and linked at the bottom of
          the page. Where a page could not be read or did not say, the table says &quot;Not confirmed&quot; instead of
          guessing. Prices and features change, so check the vendor before you decide. These pages are written by{" "}
          {SITE_NAME}, so read them with that in mind.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((c) => (
            <Link
              key={c.slug}
              href={`/vs/${c.slug}`}
              className="group rounded-xl border border-(--color-border) bg-(--color-surface) p-6 transition-colors hover:border-(--color-brand)"
            >
              <h2 className="text-h3 font-semibold text-(--color-text-primary)">
                {SITE_NAME} vs {c.name}
              </h2>
              <p className="mt-2 text-small text-(--color-text-secondary)">{c.pricingCompetitor}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-small font-medium text-(--color-brand)">
                Read the comparison <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
