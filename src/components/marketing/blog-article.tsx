import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { BlogPost, Block, Inline } from "@/lib/blog/posts";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

/** "2026-10-06" → "October 6, 2026" (UTC, so it never shifts a day). */
export function formatPostDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Escapes "</" so embedded JSON can never close the surrounding <script> tag. */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}

function InlineText({ content }: { content: Inline[] }) {
  return (
    <>
      {content.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <Link key={i} href={part.href} className="font-medium text-(--color-brand) hover:underline">
            {part.text}
          </Link>
        ),
      )}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-10 text-h2 text-(--color-text-primary)">{block.text}</h2>;
    case "p":
      return (
        <p className="mt-4 text-body leading-relaxed text-(--color-text-secondary)">
          <InlineText content={block.content} />
        </p>
      );
    case "ul":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-6 text-body leading-relaxed text-(--color-text-secondary)">
          {block.items.map((item, i) => (
            <li key={i}>
              <InlineText content={item} />
            </li>
          ))}
        </ul>
      );
    case "formula":
      return (
        <pre className="mt-4 overflow-x-auto rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-4 font-mono text-small leading-relaxed text-(--color-text-primary)">
          {block.lines.join("\n")}
        </pre>
      );
    case "note":
      return (
        <p className="mt-4 rounded-lg border-l-4 border-(--color-brand) bg-(--color-surface-secondary) p-4 text-body text-(--color-text-secondary)">
          <InlineText content={block.content} />
        </p>
      );
  }
}

export function BlogArticle({ post }: { post: BlogPost }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.updated,
    mainEntityOfPage: url,
    url,
    author: { "@type": "Organization", name: `${SITE_NAME} team`, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }} />

      <Link href="/blog" className="inline-flex items-center gap-1 text-small text-(--color-text-muted) hover:text-(--color-text-primary)">
        <ArrowLeft size={14} />
        All guides
      </Link>

      <h1 className="mt-6 text-h1 text-(--color-text-primary)">{post.title}</h1>
      <p className="mt-3 text-small text-(--color-text-muted)">
        By the {SITE_NAME} team · {formatPostDate(post.published)}
        {post.updated !== post.published ? ` · Updated ${formatPostDate(post.updated)}` : ""} · {post.readingMinutes} min
        read
      </p>

      <div className="mt-6">
        {post.body.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-(--color-surface-secondary) p-8">
        <h2 className="text-h3 font-semibold text-(--color-text-primary)">See it on real numbers</h2>
        <p className="mt-2 text-body text-(--color-text-secondary)">
          The live demo runs these calculations on a sample four-warehouse distributor. No sign-up needed.
        </p>
        <Link
          href="/dashboard/overview?demo=true"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-(--color-brand) px-5 py-2.5 text-body font-semibold text-white transition-colors hover:bg-(--color-brand-hover)"
        >
          Open the live demo
          <ArrowRight size={16} />
        </Link>
      </div>

      <nav aria-label="More guides" className="mt-12">
        <h2 className="text-h3 font-semibold text-(--color-text-primary)">More guides</h2>
        <ul className="mt-4 space-y-2">
          {related.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="text-body font-medium text-(--color-brand) hover:underline">
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
