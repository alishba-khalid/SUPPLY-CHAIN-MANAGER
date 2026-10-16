import Link from "next/link";
import { getTerm } from "@/lib/glossary";

/** Links a marketing page to the glossary terms behind it. */
export function RelatedTerms({ slugs }: { slugs: string[] }) {
  const terms = slugs.map(getTerm).filter((t) => t !== undefined);
  if (terms.length === 0) return null;

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
      <h2 className="text-h3 font-semibold text-(--color-text-primary)">Key terms</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {terms.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/glossary/${t.slug}`}
              className="inline-block rounded-full border border-(--color-border) px-3 py-1 text-small text-(--color-text-secondary) hover:border-(--color-brand) hover:text-(--color-text-primary)"
            >
              {t.term}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
