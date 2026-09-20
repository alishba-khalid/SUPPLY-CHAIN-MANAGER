import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

// /about and /terms are deliberately excluded — both are noindex'd because
// they're missing content a business decision still needs to fill in
// (About: Founder section; Terms: Governing Law section). Add them back
// here once that content ships and their `robots.index` flips back to true.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
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
