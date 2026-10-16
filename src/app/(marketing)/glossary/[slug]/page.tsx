import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GLOSSARY_TERMS, getTerm } from "@/lib/glossary";
import { glossaryMetaTitle } from "@/lib/glossary/meta";
import { GlossaryTermArticle } from "@/components/marketing/glossary-term";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

export async function generateStaticParams() {
  return GLOSSARY_TERMS.map((term) => ({ slug: term.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const term = getTerm(slug);
  if (!term) return { title: "Page Not Found" };

  const url = `${SITE_URL}/glossary/${term.slug}`;
  const title = glossaryMetaTitle(term);
  return {
    title,
    description: term.definition,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description: term.definition,
      url,
      siteName: SITE_NAME,
      type: "article",
      modifiedTime: term.updated,
    },
    twitter: { card: "summary_large_image", title, description: term.definition },
  };
}

export default async function GlossaryTermPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const term = getTerm(slug);
  if (!term) notFound();

  return <GlossaryTermArticle term={term} />;
}
