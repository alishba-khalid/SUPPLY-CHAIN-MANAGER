import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { formatPostDate } from "@/components/marketing/blog-article";

const TITLE = `Inventory & Purchasing Guides for Distributors | ${SITE_NAME}`;
const DESCRIPTION =
  "Practical guides for wholesale distributors: reorder points, safety stock, supplier OTIF, overstock and fixing projected stockouts — with worked examples.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/blog` },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog`,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.published.localeCompare(a.published));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-h1 text-(--color-text-primary)">Guides for distributors</h1>
      <p className="mt-4 text-body-lg text-(--color-text-secondary)">
        How to decide what to order, when, and from whom — the formulas, worked examples and the mistakes to avoid.
      </p>

      <ul className="mt-12 space-y-6">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-(--color-border) bg-(--color-surface) p-6 transition-colors hover:border-(--color-brand)"
            >
              <h2 className="text-h3 font-semibold text-(--color-text-primary)">{post.title}</h2>
              <p className="mt-2 text-body text-(--color-text-secondary)">{post.description}</p>
              <p className="mt-3 text-caption text-(--color-text-muted)">
                {formatPostDate(post.published)} · {post.readingMinutes} min read
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
