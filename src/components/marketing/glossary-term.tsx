import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { CATEGORY_LABELS, getTerm, type GlossaryTerm } from "@/lib/glossary";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { formatPostDate, InlineText, safeJsonLd } from "@/components/marketing/blog-article";

function Paragraphs({ items }: { items: GlossaryTerm["explain"] }) {
  return (
    <>
      {items.map((content, i) => (
        <p key={i} className="mt-4 text-body leading-relaxed text-(--color-text-secondary)">
          <InlineText content={content} />
        </p>
      ))}
    </>
  );
}

/** The short name as it reads mid-sentence: "days of supply", but "EOQ" and "Croston's method" keep their capitals. */
function midSentence(short: string): string {
  return /^[A-Z]{2}|^Croston/.test(short) ? short : short.charAt(0).toLowerCase() + short.slice(1);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mt-10 text-h2 text-(--color-text-primary)">{title}</h2>
      {children}
    </section>
  );
}

export function GlossaryTermArticle({ term }: { term: GlossaryTerm }) {
  const url = `${SITE_URL}/glossary/${term.slug}`;
  const mid = midSentence(term.short);
  const related = term.related.map(getTerm).filter((t) => t !== undefined);
  const guides = (term.guides ?? [])
    .map((slug) => BLOG_POSTS.find((p) => p.slug === slug))
    .filter((p) => p !== undefined);

  const definedTerm = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    description: term.definition,
    url,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: `${SITE_NAME} supply chain glossary`,
      url: `${SITE_URL}/glossary`,
    },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Glossary", item: `${SITE_URL}/glossary` },
      { "@type": "ListItem", position: 3, name: term.term, item: url },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(definedTerm) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }} />

      <Link
        href="/glossary"
        className="inline-flex items-center gap-1 text-small text-(--color-text-muted) hover:text-(--color-text-primary)"
      >
        <ArrowLeft size={14} />
        Supply chain glossary
      </Link>

      <p className="mt-6 text-caption font-semibold uppercase tracking-wide text-(--color-brand)">
        {CATEGORY_LABELS[term.category]}
      </p>
      <h1 className="mt-2 text-h1 text-(--color-text-primary)">{term.term}</h1>
      <p className="mt-3 text-small text-(--color-text-muted)">
        By the {SITE_NAME} team · Updated {formatPostDate(term.updated)}
      </p>

      <p className="mt-6 rounded-lg border-l-4 border-(--color-brand) bg-(--color-surface-secondary) p-4 text-body-lg leading-relaxed text-(--color-text-primary)">
        {term.definition}
      </p>

      <Paragraphs items={term.explain} />

      {term.formula && (
        <Section title={`How to calculate ${mid}`}>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-4 font-mono text-small leading-relaxed text-(--color-text-primary)">
            {term.formula.join("\n")}
          </pre>
        </Section>
      )}

      <Section title={`${term.short} example`}>
        <Paragraphs items={term.example} />
      </Section>

      <Section title={`Why ${mid} matters for distributors`}>
        <Paragraphs items={term.why} />
      </Section>

      <Section title={`Common ${mid} mistakes`}>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-body leading-relaxed text-(--color-text-secondary)">
          {term.mistakes.map((item, i) => (
            <li key={i}>
              <InlineText content={item} />
            </li>
          ))}
        </ul>
      </Section>

      {term.inApp && (
        <Section title={`${term.short} in ${SITE_NAME}`}>
          <p className="mt-4 text-body leading-relaxed text-(--color-text-secondary)">
            <InlineText content={term.inApp} />
          </p>
          <Link
            href="/dashboard/overview?demo=true"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-(--color-brand) px-5 py-2.5 text-body font-semibold text-white transition-colors hover:bg-(--color-brand-hover)"
          >
            Open the live demo
            <ArrowRight size={16} />
          </Link>
        </Section>
      )}

      {(related.length > 0 || guides.length > 0) && (
        <nav aria-label="Related terms" className="mt-12 grid gap-6 sm:grid-cols-2">
          {related.length > 0 && (
            <div>
              <h2 className="text-h3 font-semibold text-(--color-text-primary)">Related terms</h2>
              <ul className="mt-3 space-y-2">
                {related.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/glossary/${t.slug}`} className="text-body font-medium text-(--color-brand) hover:underline">
                      {t.term}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {guides.length > 0 && (
            <div>
              <h2 className="text-h3 font-semibold text-(--color-text-primary)">In-depth guides</h2>
              <ul className="mt-3 space-y-2">
                {guides.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/blog/${p.slug}`} className="text-body font-medium text-(--color-brand) hover:underline">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      )}

      <p className="mt-12 text-caption text-(--color-text-muted)">
        Examples on this page use made-up round numbers to show the calculation. They are not benchmarks or results
        from real businesses.
      </p>
    </article>
  );
}
