import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURE_PAGES, FEATURE_PAGE_SLUGS } from "@/lib/feature-pages";
import { FeatureArticle } from "@/components/marketing/feature-article";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

// The three older feature pages (demand-forecasting, purchase-orders,
// supplier-scorecards) are static folders next to this one and take priority.
export async function generateStaticParams() {
  return FEATURE_PAGE_SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = FEATURE_PAGES[slug];
  if (!page) return { title: "Page Not Found" };

  const url = `${SITE_URL}/features/${slug}`;
  return {
    title: page.metaTitle,
    description: page.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: page.metaTitle,
      description: page.description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = FEATURE_PAGES[slug];
  if (!page) notFound();
  return <FeatureArticle page={page} />;
}
