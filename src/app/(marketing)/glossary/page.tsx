import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_LABELS, GLOSSARY_TERMS, GUIDE_ENTRIES, type GlossaryCategory } from "@/lib/glossary";
import { safeJsonLd } from "@/components/marketing/blog-article";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `Supply Chain & Inventory Glossary for Distributors | ${SITE_NAME}`;
const DESCRIPTION =
  "Plain-English definitions of inventory, forecasting, purchasing and warehouse terms, with formulas and worked examples for wholesale distributors.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/glossary` },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/glossary`,
    siteName: SITE_NAME,
    type: "website",
  },
};

interface Entry {
  name: string;
  href: string;
  definition: string;
}

const CATEGORY_ORDER: GlossaryCategory[] = ["inventory", "forecasting", "purchasing", "warehouse", "finance"];

function entriesFor(category: GlossaryCategory): Entry[] {
  const terms: Entry[] = GLOSSARY_TERMS.filter((t) => t.category === category).map((t) => ({
    name: t.term,
    href: `/glossary/${t.slug}`,
    definition: t.definition,
  }));
  const guides: Entry[] = GUIDE_ENTRIES.filter((e) => e.category === category).map((e) => ({
    name: e.term,
    href: e.href,
    definition: e.definition,
  }));
  return [...terms, ...guides].sort((a, b) => a.name.localeCompare(b.name));
}

export default function GlossaryIndexPage() {
  const termSet = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: `${SITE_NAME} supply chain glossary`,
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      url: `${SITE_URL}/glossary/${t.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(termSet) }} />

      <h1 className="text-h1 text-(--color-text-primary)">Supply chain glossary</h1>
      <p className="mt-4 text-body-lg text-(--color-text-secondary)">
        {GLOSSARY_TERMS.length + GUIDE_ENTRIES.length} inventory, forecasting, purchasing and warehouse terms, explained
        for wholesale distributors. Each entry has a plain definition, the formula where there is one, a worked
        example and the mistakes to avoid.
      </p>

      <nav aria-label="Glossary sections" className="mt-8 flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((c) => (
          <a
            key={c}
            href={`#${c}`}
            className="rounded-full border border-(--color-border) px-3 py-1 text-small text-(--color-text-secondary) hover:border-(--color-brand) hover:text-(--color-text-primary)"
          >
            {CATEGORY_LABELS[c]}
          </a>
        ))}
      </nav>

      {CATEGORY_ORDER.map((category) => (
        <section key={category} id={category} className="mt-14 scroll-mt-24">
          <h2 className="text-h2 text-(--color-text-primary)">{CATEGORY_LABELS[category]}</h2>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {entriesFor(category).map((entry) => (
              <div
                key={entry.href + entry.name}
                className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5 transition-colors hover:border-(--color-brand)"
              >
                <dt>
                  <Link href={entry.href} className="text-body font-semibold text-(--color-brand) hover:underline">
                    {entry.name}
                  </Link>
                </dt>
                <dd className="mt-2 text-small leading-relaxed text-(--color-text-secondary)">{entry.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <p className="mt-14 text-body text-(--color-text-secondary)">
        Want the longer version? The{" "}
        <Link href="/blog" className="font-medium text-(--color-brand) hover:underline">
          guides
        </Link>{" "}
        walk through reorder points, safety stock and supplier OTIF step by step.
      </p>
    </div>
  );
}
