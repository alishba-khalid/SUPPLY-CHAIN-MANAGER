import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOL_PAGES, TOOL_PAGE_SLUGS } from "@/lib/tool-pages";
import { FeatureArticle } from "@/components/marketing/feature-article";
import { CalculatorWidget } from "@/components/marketing/calculator-widget";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

export async function generateStaticParams() {
  return TOOL_PAGE_SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = TOOL_PAGES[slug];
  if (!page) return { title: "Page Not Found" };

  const url = `${SITE_URL}/tools/${slug}`;
  return {
    title: page.metaTitle,
    description: page.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { title: page.metaTitle, description: page.description, url, siteName: SITE_NAME, type: "website" },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = TOOL_PAGES[slug];
  if (!page) notFound();
  return (
    <FeatureArticle page={page} basePath="tools" cta={false}>
      <CalculatorWidget tool={page.tool} />
    </FeatureArticle>
  );
}
