import { SITEMAP_SECTIONS, SITEMAP_SECTION_NAMES, renderUrlSet, type SitemapSection } from "@/lib/sitemap-data";

// /sitemaps/pages.xml, features.xml, compare.xml, blog.xml, glossary.xml
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return SITEMAP_SECTION_NAMES.map((name) => ({ section: `${name}.xml` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const name = section.replace(/\.xml$/, "") as SitemapSection;
  if (!(name in SITEMAP_SECTIONS)) return new Response("Not found", { status: 404 });
  return new Response(renderUrlSet(SITEMAP_SECTIONS[name]()), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
