import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";
import { COMPETITORS } from "@/lib/competitors-data";

// When each page's content last changed. Update the date when you edit a
// page — a date that moves on every deploy tells search engines nothing.
const HOME_UPDATED = new Date("2026-09-28");
const COMPETITORS_UPDATED = new Date("2026-09-20");
const FEATURES_UPDATED: Record<string, Date> = {
  "demand-forecasting": new Date("2026-09-28"),
  "supplier-scorecards": new Date("2026-09-28"),
  "purchase-orders": new Date("2026-09-20"),
};
const ABOUT_UPDATED = new Date("2026-09-28");
// The legal pages' own "Last updated" dates.
const LEGAL_UPDATED = new Date("2026-10-06");

export default function sitemap(): MetadataRoute.Sitemap {
  const competitorEntries: MetadataRoute.Sitemap = Object.keys(COMPETITORS).map((slug) => ({
    url: `${SITE_URL}/vs/${slug}`,
    lastModified: COMPETITORS_UPDATED,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const featureEntries: MetadataRoute.Sitemap = Object.entries(FEATURES_UPDATED).map(([feature, lastModified]) => ({
    url: `${SITE_URL}/features/${feature}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: HOME_UPDATED,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...competitorEntries,
    ...featureEntries,
    {
      url: `${SITE_URL}/about`,
      lastModified: ABOUT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: LEGAL_UPDATED,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: LEGAL_UPDATED,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/security`,
      lastModified: LEGAL_UPDATED,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
