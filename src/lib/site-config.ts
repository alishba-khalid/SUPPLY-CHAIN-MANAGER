/**
 * Marketing-site facts (brand, domain, pricing, copy). Everything here is a
 * placeholder pending real business decisions — see the note at the bottom
 * of this file — but is centralized so it only needs to change in one
 * place. Never invented: dashboard data, module capabilities, and feature
 * copy are all derived from the real app (src/lib, src/data/repositories,
 * src/app/(app)/dashboard).
 */

import { PLAN_DEFINITIONS, TIER_ORDER } from "@/lib/subscriptions/tiers";

export const SITE_NAME = "Supply Chain Manager";
// Single source of truth for the site's canonical URL. Everything that
// needs it (canonical tags, og:url, sitemap.xml, robots.txt, structured
// data, metadataBase) imports SITE_URL from here rather than hardcoding
// the domain — override via NEXT_PUBLIC_SITE_URL for previews/local dev.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://supplychainmanager.app";
export const CONTACT_EMAIL = "alishbakhalid76@gmail.com";
export const PRIMARY_KEYWORD = "supply chain software for distributors";
export const TAGLINE = "Your supply chain just hired a manager.";

export type BillingPeriod = "monthly" | "annual";

export interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number; // USD; for "contact us" tiers, the "From $X" starting price
  contactUsInstead: boolean;
  audience: string;
  features: string[];
  highlighted: boolean;
}

export const ANNUAL_DISCOUNT_PERCENT = 20;

// Built from the one plan catalog (src/lib/subscriptions/tiers.ts) — never
// copy a price, limit or feature here.
export const PRICING_TIERS: PricingTier[] = TIER_ORDER.map((id) => {
  const plan = PLAN_DEFINITIONS[id];
  return {
    id,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice,
    contactUsInstead: plan.contactUsInstead,
    audience: plan.audience,
    features: plan.features,
    highlighted: plan.highlighted ?? false,
  };
});

/** The lowest self-serve monthly price, for "from $X a month" copy. */
export const STARTING_MONTHLY_PRICE = PLAN_DEFINITIONS.starter.monthlyPrice;

/**
 * NEEDS REAL VALUES: brand/company name, contact email, primary keyword,
 * and pricing were not provided when this was built and are placeholders
 * written to be plausible, not fabricated as verified facts. SITE_URL is
 * the one confirmed real value — supplychainmanager.app is purchased and
 * pointed at Vercel. Update the rest of this file before launch — every
 * marketing page, the sitemap, robots.txt, and structured data all read
 * from here.
 */
