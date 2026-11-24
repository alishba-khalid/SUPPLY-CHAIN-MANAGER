import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOG_POSTS, type Block, type Inline } from "../posts";
import { bodyWords } from "../helpers";
import { getTerm } from "@/lib/glossary";
import { FEATURE_PAGES } from "@/lib/feature-pages";
import { TOOL_PAGES } from "@/lib/tool-pages";

const STATIC_FEATURES = new Set(["demand-forecasting", "purchase-orders", "supplier-scorecards"]);

function inlines(body: Block[]): Inline[] {
  const out: Inline[] = [];
  for (const b of body) {
    if (b.type === "p" || b.type === "note") out.push(...b.content);
    else if (b.type === "ul") b.items.forEach((i) => out.push(...i));
  }
  return out;
}

test("every guide has a unique slug and fits search results", () => {
  const slugs = new Set(BLOG_POSTS.map((p) => p.slug));
  assert.equal(slugs.size, BLOG_POSTS.length);
  const titles = new Set<string>();
  for (const p of BLOG_POSTS) {
    assert.ok(p.metaTitle.length <= 60, `${p.slug} title is ${p.metaTitle.length}`);
    assert.ok(p.description.length <= 160, `${p.slug} description is ${p.description.length}`);
    assert.ok(!titles.has(p.metaTitle), `duplicate title ${p.metaTitle}`);
    titles.add(p.metaTitle);
  }
});

test("every guide has 500+ words", () => {
  for (const p of BLOG_POSTS) assert.ok(bodyWords(p.body) >= 500, `${p.slug} has only ${bodyWords(p.body)} words`);
});

test("every internal link in a guide resolves", () => {
  const blog = new Set(BLOG_POSTS.map((p) => p.slug));
  for (const p of BLOG_POSTS) {
    for (const r of p.related ?? []) assert.ok(blog.has(r), `${p.slug} → missing related ${r}`);
    for (const i of inlines(p.body)) {
      if (typeof i === "string") continue;
      const h = i.href.split("?")[0];
      if (h.startsWith("/blog/")) assert.ok(blog.has(h.slice(6)), `${p.slug} → broken ${h}`);
      else if (h.startsWith("/glossary/")) assert.ok(getTerm(h.slice(10)), `${p.slug} → broken ${h}`);
      else if (h.startsWith("/features/")) assert.ok(h.slice(10) in FEATURE_PAGES || STATIC_FEATURES.has(h.slice(10)), `${p.slug} → broken ${h}`);
      else if (h.startsWith("/tools/")) assert.ok(h.slice(7) in TOOL_PAGES, `${p.slug} → broken ${h}`);
      else assert.ok(["/vs", "/pricing", "/dashboard/overview", "/templates/supplier-scorecard-template.csv"].includes(h), `${p.slug} → unexpected ${h}`);
    }
  }
});
