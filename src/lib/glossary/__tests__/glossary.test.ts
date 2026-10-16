import { test } from "node:test";
import assert from "node:assert/strict";
import { GLOSSARY_TERMS, GUIDE_ENTRIES, getTerm, type GlossaryTerm } from "../index";
import { glossaryMetaTitle, MAX_TITLE_LENGTH } from "../meta";
import { BLOG_POSTS } from "@/lib/blog/posts";
import type { Inline } from "@/lib/blog/posts";

const allInlines = (t: GlossaryTerm): Inline[] =>
  [...t.explain, ...t.example, ...t.why, ...t.mistakes, t.inApp ?? []].flat();

test("at least 100 glossary pages with unique slugs and names", () => {
  assert.ok(GLOSSARY_TERMS.length >= 100, `only ${GLOSSARY_TERMS.length} terms`);
  const slugs = new Set(GLOSSARY_TERMS.map((t) => t.slug));
  assert.equal(slugs.size, GLOSSARY_TERMS.length, "duplicate slug");
  const names = new Set(GLOSSARY_TERMS.map((t) => t.term.toLowerCase()));
  assert.equal(names.size, GLOSSARY_TERMS.length, "duplicate term name");
});

test("no glossary page competes with a blog guide for the same term", () => {
  const guideNames = GUIDE_ENTRIES.map((e) => e.term.toLowerCase());
  for (const t of GLOSSARY_TERMS) {
    assert.ok(!guideNames.includes(t.term.toLowerCase()), `${t.slug} duplicates a guide`);
  }
  for (const e of GUIDE_ENTRIES) {
    const slug = e.href.replace("/blog/", "");
    assert.ok(BLOG_POSTS.some((p) => p.slug === slug), `guide entry points to missing post ${e.href}`);
  }
});

test("every definition fits a meta description and every title fits search results", () => {
  const titles = new Set<string>();
  for (const t of GLOSSARY_TERMS) {
    assert.ok(t.definition.length <= 160, `${t.slug} definition is ${t.definition.length} chars`);
    assert.ok(t.definition.length >= 70, `${t.slug} definition is too thin`);
    const title = glossaryMetaTitle(t);
    assert.ok(title.length <= MAX_TITLE_LENGTH, `${t.slug} title too long: ${title}`);
    assert.ok(!titles.has(title), `duplicate title ${title}`);
    titles.add(title);
  }
});

test("every page has substance: explanation, example, why, at least two mistakes, related terms", () => {
  for (const t of GLOSSARY_TERMS) {
    assert.ok(t.explain.length >= 1 && t.example.length >= 1 && t.why.length >= 1, t.slug);
    assert.ok(t.mistakes.length >= 2, `${t.slug} needs at least two mistakes`);
    assert.ok(t.related.length >= 3, `${t.slug} needs at least three related terms`);
    const words = allInlines(t)
      .map((i) => (typeof i === "string" ? i : i.text))
      .join(" ")
      .split(/\s+/).length;
    assert.ok(words >= 130, `${t.slug} body is only ${words} words`);
  }
});

test("examples say they are illustrative", () => {
  for (const t of GLOSSARY_TERMS) {
    const first = t.example[0].map((i) => (typeof i === "string" ? i : i.text)).join("");
    assert.match(first, /^Illustrative/, `${t.slug} example does not start with "Illustrative"`);
  }
});

test("every internal link resolves", () => {
  const blogSlugs = new Set(BLOG_POSTS.map((p) => p.slug));
  for (const t of GLOSSARY_TERMS) {
    for (const r of t.related) {
      assert.ok(getTerm(r), `${t.slug} → missing related term ${r}`);
      assert.notEqual(r, t.slug, `${t.slug} relates to itself`);
    }
    for (const gSlug of t.guides ?? []) assert.ok(blogSlugs.has(gSlug), `${t.slug} → missing guide ${gSlug}`);
    for (const i of allInlines(t)) {
      if (typeof i === "string") continue;
      if (i.href.startsWith("/glossary/")) assert.ok(getTerm(i.href.slice(10)), `${t.slug} → broken link ${i.href}`);
      else if (i.href.startsWith("/blog/")) assert.ok(blogSlugs.has(i.href.slice(6)), `${t.slug} → broken link ${i.href}`);
      else assert.fail(`${t.slug} links outside the glossary/blog: ${i.href}`);
    }
  }
});

test("every term is reachable from at least one other term", () => {
  const linkedTo = new Set(GLOSSARY_TERMS.flatMap((t) => t.related));
  for (const t of GLOSSARY_TERMS) assert.ok(linkedTo.has(t.slug), `${t.slug} has no inbound related link`);
});
