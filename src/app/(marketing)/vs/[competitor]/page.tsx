import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMPETITORS } from "@/lib/competitors-data";
import { CompetitorPage } from "@/components/marketing/competitor-page";
import { SITE_URL } from "@/lib/site-config";

export async function generateStaticParams() {
  return Object.keys(COMPETITORS).map((competitor) => ({
    competitor,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const data = COMPETITORS[competitor];

  if (!data) {
    return { title: "Page Not Found" };
  }

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: { canonical: `${SITE_URL}/vs/${competitor}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `${SITE_URL}/vs/${competitor}`,
      type: "website",
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const data = COMPETITORS[competitor];

  if (!data) {
    notFound();
  }

  return <CompetitorPage data={data} />;
}
