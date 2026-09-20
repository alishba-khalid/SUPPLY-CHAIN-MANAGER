import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";
import { COMPETITORS } from "@/lib/competitors-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  
  const competitorEntries: MetadataRoute.Sitemap = Object.keys(COMPETITORS).map((slug) => ({
    url: `${SITE_URL}/vs/${slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const featureEntries: MetadataRoute.Sitemap = [
    "demand-forecasting",
    "supplier-scorecards",
    "purchase-orders",
  ].map((feature) => ({
    url: `${SITE_URL}/features/${feature}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...competitorEntries,
    ...featureEntries,
    {
      url: `${SITE_URL}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/security`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
