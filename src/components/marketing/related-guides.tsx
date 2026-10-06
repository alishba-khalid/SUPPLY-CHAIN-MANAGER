import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog/posts";

/** Links a feature page to the guides that explain its math. */
export function RelatedGuides({ slugs }: { slugs: string[] }) {
  const posts = slugs
    .map((slug) => BLOG_POSTS.find((post) => post.slug === slug))
    .filter((post) => post !== undefined);
  if (posts.length === 0) return null;

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
      <h2 className="text-h3 font-semibold text-(--color-text-primary)">Related guides</h2>
      <ul className="mt-3 space-y-2">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="text-body font-medium text-(--color-brand) hover:underline">
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
