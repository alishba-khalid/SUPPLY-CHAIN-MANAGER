import { SITE_URL } from "@/lib/site-config";
import { COMPETITORS, COMPETITORS_CHECKED } from "@/lib/competitors-data";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { GLOSSARY_TERMS, GLOSSARY_UPDATED } from "@/lib/glossary";
import { FEATURE_PAGES } from "@/lib/feature-pages";
import { TOOL_PAGES } from "@/lib/tool-pages";

export interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
}

// When each page's content last changed. Update the date when you edit a
// page — a date that moves on every deploy tells search engines nothing.
const HOME_UPDATED = new Date("2026-09-28");
const SECTION_PAGES_UPDATED = new Date("2026-10-06");
const COMPETITORS_UPDATED = new Date(COMPETITORS_CHECKED);
const OLDER_FEATURES_UPDATED = new Date("2026-10-16");
const ABOUT_UPDATED = new Date("2026-09-28");
// The legal pages' own "Last updated" dates.
const LEGAL_UPDATED = new Date("2026-10-06");

const entry = (path: string, lastModified: Date, changeFrequency: SitemapEntry["changeFrequency"], priority: number): SitemapEntry => ({
  url: path === "" ? SITE_URL : `${SITE_URL}${path}`,
  lastModified,
  changeFrequency,
  priority,
});

/** One sitemap file per section; /sitemap.xml is an index that points to them. */
export const SITEMAP_SECTIONS = {
  pages: (): SitemapEntry[] => [
    entry("", HOME_UPDATED, "weekly", 1),
    ...["features", "how-it-works", "pricing", "faq"].map((p) => entry(`/${p}`, SECTION_PAGES_UPDATED, "monthly", 0.9)),
    entry("/about", ABOUT_UPDATED, "monthly", 0.7),
    entry("/terms", LEGAL_UPDATED, "yearly", 0.4),
    entry("/privacy", LEGAL_UPDATED, "yearly", 0.4),
    entry("/security", LEGAL_UPDATED, "yearly", 0.4),
  ],
  features: (): SitemapEntry[] => [
    ...["demand-forecasting", "supplier-scorecards", "purchase-orders"].map((s) => entry(`/features/${s}`, OLDER_FEATURES_UPDATED, "monthly", 0.8)),
    ...Object.values(FEATURE_PAGES).map((p) => entry(`/features/${p.slug}`, new Date(p.updated), "monthly", 0.8)),
    ...Object.values(TOOL_PAGES).map((p) => entry(`/tools/${p.slug}`, new Date(p.updated), "monthly", 0.7)),
  ],
  compare: (): SitemapEntry[] => [
    entry("/vs", COMPETITORS_UPDATED, "monthly", 0.8),
    ...Object.keys(COMPETITORS).map((s) => entry(`/vs/${s}`, COMPETITORS_UPDATED, "monthly", 0.8)),
  ],
  blog: (): SitemapEntry[] => [
    entry("/blog", new Date(BLOG_POSTS.map((p) => p.updated).sort().at(-1)!), "weekly", 0.8),
    ...BLOG_POSTS.map((p) => entry(`/blog/${p.slug}`, new Date(p.updated), "monthly", 0.7)),
  ],
  glossary: (): SitemapEntry[] => [
    entry("/glossary", new Date(GLOSSARY_UPDATED), "monthly", 0.7),
    ...GLOSSARY_TERMS.map((t) => entry(`/glossary/${t.slug}`, new Date(t.updated), "monthly", 0.6)),
  ],
} as const;

export type SitemapSection = keyof typeof SITEMAP_SECTIONS;
export const SITEMAP_SECTION_NAMES = Object.keys(SITEMAP_SECTIONS) as SitemapSection[];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const day = (d: Date) => d.toISOString().slice(0, 10);

export function renderUrlSet(entries: SitemapEntry[]): string {
  const rows = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${esc(e.url)}</loc>\n    <lastmod>${day(e.lastModified)}</lastmod>\n    <changefreq>${e.changeFrequency}</changefreq>\n    <priority>${e.priority.toFixed(1)}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

export function renderIndex(): string {
  const rows = SITEMAP_SECTION_NAMES.map((name) => {
    const latest = SITEMAP_SECTIONS[name]()
      .map((e) => e.lastModified.getTime())
      .reduce((a, b) => Math.max(a, b), 0);
    return `  <sitemap>\n    <loc>${esc(`${SITE_URL}/sitemaps/${name}.xml`)}</loc>\n    <lastmod>${day(new Date(latest))}</lastmod>\n  </sitemap>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</sitemapindex>\n`;
}

export function allSitemapUrls(): string[] {
  return SITEMAP_SECTION_NAMES.flatMap((n) => SITEMAP_SECTIONS[n]().map((e) => e.url));
}
