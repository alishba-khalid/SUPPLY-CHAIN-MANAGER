import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { RelatedGuides } from "@/components/marketing/related-guides";
import { RelatedTerms } from "@/components/marketing/related-terms";
import { InlineText, safeJsonLd } from "@/components/marketing/blog-article";
import type { FeaturePageData } from "@/lib/feature-pages";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

export function FeatureArticle({ page }: { page: FeaturePageData }) {
  const url = `${SITE_URL}/features/${page.slug}`;
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Features", item: `${SITE_URL}/features` },
      { "@type": "ListItem", position: 3, name: page.badge, item: url },
    ],
  };

  return (
    <div className="py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }} />

      <section className="mx-auto max-w-4xl px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-secondary) px-3 py-1 text-caption font-medium text-(--color-brand)">
          <Sparkles size={14} />
          {page.badge}
        </span>
        <h1 className="mt-4 text-h1 text-(--color-text-primary)">{page.h1}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-body-lg text-(--color-text-secondary)">{page.lead}</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/dashboard/overview?demo=true"
            className="inline-flex items-center gap-2 rounded-lg bg-(--color-brand) px-6 py-3 text-body font-semibold text-white transition-colors hover:bg-(--color-brand-hover)"
          >
            See live demo
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <div className="mx-auto mt-16 max-w-3xl space-y-12 px-6">
        {page.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-h2 text-(--color-text-primary)">{section.title}</h2>
            {section.paragraphs?.map((content, i) => (
              <p key={i} className="mt-4 text-body leading-relaxed text-(--color-text-secondary)">
                <InlineText content={content} />
              </p>
            ))}
            {section.formula && (
              <pre className="mt-4 overflow-x-auto rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-4 font-mono text-small leading-relaxed text-(--color-text-primary)">
                {section.formula.join("\n")}
              </pre>
            )}
            {section.table && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-small">
                  <thead>
                    <tr>
                      {section.table.head.map((h) => (
                        <th key={h} className="border-b border-(--color-border) px-3 py-2 font-semibold text-(--color-text-primary)">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="border-b border-(--color-border) px-3 py-2 align-top text-(--color-text-secondary)">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {section.bullets && (
              <ul className="mt-4 list-disc space-y-2 pl-6 text-body leading-relaxed text-(--color-text-secondary)">
                {section.bullets.map((item, i) => (
                  <li key={i}>
                    <InlineText content={item} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="rounded-2xl bg-(--color-surface-secondary) p-8">
          <h2 className="text-h2 text-(--color-text-primary)">What it does not do</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-body leading-relaxed text-(--color-text-secondary)">
            {page.limits.map((item, i) => (
              <li key={i}>
                <InlineText content={item} />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-h2 text-(--color-text-primary)">Common questions</h2>
          <dl className="mt-4 space-y-5">
            {page.faq.map((item) => (
              <div key={item.q}>
                <dt className="text-body font-semibold text-(--color-text-primary)">{item.q}</dt>
                <dd className="mt-1 text-body leading-relaxed text-(--color-text-secondary)">
                  <InlineText content={item.a} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <RelatedGuides slugs={page.guides} />
        <RelatedTerms slugs={page.terms} />

        <p className="text-caption text-(--color-text-muted)">
          {SITE_NAME} · Last checked against the product on {page.updated}. Figures in examples are illustrative.
        </p>
      </div>
    </div>
  );
}
