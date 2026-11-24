import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURE_PAGES, type FeaturePageData } from "../feature-pages";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { getTerm } from "@/lib/glossary";
import type { Inline } from "@/lib/blog/posts";

const txt = (a: Inline[]) => a.map((i) => (typeof i === "string" ? i : i.text)).join("");

function words(p: FeaturePageData): number {
  const parts: string[] = [p.lead];
  for (const s of p.sections) {
    parts.push(s.title);
    (s.paragraphs ?? []).forEach((x) => parts.push(txt(x)));
    (s.bullets ?? []).forEach((x) => parts.push(txt(x)));
    (s.formula ?? []).forEach((x) => parts.push(x));
    if (s.table) parts.push(...s.table.head, ...s.table.rows.flat());
  }
  p.limits.forEach((x) => parts.push(txt(x)));
  p.faq.forEach((f) => parts.push(f.q, txt(f.a)));
  return parts.join(" ").split(/\s+/).filter(Boolean).length;
}

test("six new feature pages exist with unique slugs", () => {
  assert.equal(Object.keys(FEATURE_PAGES).length, 6);
  for (const [key, p] of Object.entries(FEATURE_PAGES)) assert.equal(key, p.slug);
});

test("titles and descriptions fit search results", () => {
  const titles = new Set<string>();
  for (const p of Object.values(FEATURE_PAGES)) {
    assert.ok(p.metaTitle.length >= 20 && p.metaTitle.length <= 60, `${p.slug} title is ${p.metaTitle.length}`);
    assert.ok(p.description.length >= 70 && p.description.length <= 160, `${p.slug} description is ${p.description.length}`);
    assert.ok(!titles.has(p.metaTitle), `duplicate title ${p.metaTitle}`);
    titles.add(p.metaTitle);
  }
});

test("each page has 500+ words, honest limits, a FAQ and a table or formula", () => {
  for (const p of Object.values(FEATURE_PAGES)) {
    assert.ok(words(p) >= 500, `${p.slug} has only ${words(p)} words`);
    assert.ok(p.limits.length >= 3, `${p.slug} needs at least three limits`);
    assert.ok(p.faq.length >= 3, `${p.slug} needs at least three FAQ items`);
    assert.ok(p.sections.some((s) => s.table || s.formula), `${p.slug} needs a table or formula`);
  }
});

test("internal links and related items resolve", () => {
  const blogSlugs = new Set(BLOG_POSTS.map((b) => b.slug));
  const featureSlugs = new Set(Object.keys(FEATURE_PAGES));
  const staticFeature = new Set(["demand-forecasting", "purchase-orders", "supplier-scorecards"]);
  for (const p of Object.values(FEATURE_PAGES)) {
    for (const g of p.guides) assert.ok(blogSlugs.has(g), `${p.slug} → missing guide ${g}`);
    for (const t of p.terms) assert.ok(getTerm(t), `${p.slug} → missing term ${t}`);
    const inlines: Inline[] = [
      ...p.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? [])]),
      ...p.limits,
      ...p.faq.map((f) => f.a),
    ].flat();
    for (const i of inlines) {
      if (typeof i === "string") continue;
      if (i.href.startsWith("/glossary/")) assert.ok(getTerm(i.href.slice(10)), `${p.slug} → broken ${i.href}`);
      else if (i.href.startsWith("/blog/")) assert.ok(blogSlugs.has(i.href.slice(6)), `${p.slug} → broken ${i.href}`);
      else if (i.href.startsWith("/features/")) {
        const s = i.href.slice(10);
        assert.ok(featureSlugs.has(s) || staticFeature.has(s), `${p.slug} → broken ${i.href}`);
      } else assert.ok(i.href === "/pricing", `${p.slug} links to unexpected ${i.href}`);
    }
  }
});

test("pages do not claim what the app cannot do", () => {
  const all = Object.values(FEATURE_PAGES)
    .map((p) => JSON.stringify(p))
    .join(" ")
    .toLowerCase();
  for (const banned of ["otif scorecard", "in-full", "chatgpt-powered", "powered by gpt", "real-time sync", "erp integration"]) {
    assert.ok(!all.includes(banned), `contains "${banned}"`);
  }
});
