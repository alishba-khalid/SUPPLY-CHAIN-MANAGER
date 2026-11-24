import { renderIndex } from "@/lib/sitemap-data";

// Sitemap index: one entry per section file under /sitemaps/.
export const dynamic = "force-static";

export function GET() {
  return new Response(renderIndex(), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
