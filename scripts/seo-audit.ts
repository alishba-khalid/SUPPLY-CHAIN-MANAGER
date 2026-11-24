// Read-only content audit: titles, descriptions, word counts, link counts.
import { GLOSSARY_TERMS } from "../src/lib/glossary";
import { BLOG_POSTS } from "../src/lib/blog/posts";

type Inl = string | { href: string; text: string };
const inl = (a: Inl[]) => a.map((x) => (typeof x === "string" ? x : x.text)).join("");
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

console.log("== GLOSSARY ==");
const rows = GLOSSARY_TERMS.map((t) => {
  const text = [
    t.definition,
    ...t.explain.map(inl),
    ...(t.formula ?? []),
    ...t.example.map(inl),
    ...t.why.map(inl),
    ...t.mistakes.map(inl),
    t.inApp ? inl(t.inApp) : "",
  ].join(" ");
  return { slug: t.slug, cat: t.category, words: words(text), defLen: t.definition.length, rel: t.related.length, guides: (t.guides ?? []).length };
});
rows.sort((a, b) => a.words - b.words);
for (const r of rows) console.log(`${r.words}\t${r.cat}\t${r.slug}\tdef${r.defLen}\trel${r.rel}\tg${r.guides}`);
console.log("min/median/max words:", rows[0].words, rows[Math.floor(rows.length / 2)].words, rows.at(-1)!.words);
console.log("<500 words:", rows.filter((r) => r.words < 500).length, " <300:", rows.filter((r) => r.words < 300).length);
console.log("def>160:", rows.filter((r) => r.defLen > 160).map((r) => r.slug).join(", "));

console.log("\n== BLOG ==");
for (const p of BLOG_POSTS) {
  const w = p.body.reduce((n, b) => n + (b.type === "p" || b.type === "note" ? words(inl(b.content)) : b.type === "h2" ? words(b.text) : b.type === "ul" ? b.items.reduce((m, i) => m + words(inl(i)), 0) : b.type === "formula" ? b.lines.length * 5 : b.head.length + b.rows.flat().length), 0);
  console.log(p.slug, "words", w, "title", p.metaTitle.length, "desc", p.description.length);
}
