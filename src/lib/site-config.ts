/**
 * Marketing-site facts (brand, domain, pricing, copy). Everything here is a
 * placeholder pending real business decisions — see the note at the bottom
 * of this file — but is centralized so it only needs to change in one
 * place. Never invented: dashboard data, module capabilities, and feature
 * copy are all derived from the real app (src/lib, src/data/repositories,
 * src/app/(app)/dashboard).
 */

export const SITE_NAME = "Supply Chain Manager";
export const SITE_URL = "https://supplychainmanager.io";
export const CONTACT_EMAIL = "hello@supplychainmanager.io";
export const PRIMARY_KEYWORD = "supply chain software for distributors";
export const TAGLINE = "Your supply chain just hired a manager.";

export const TRIAL_DAYS = 14;

export type BillingPeriod = "monthly" | "annual";

export interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number; // USD, 0 for "contact us" tiers
  contactUsInstead: boolean;
  audience: string;
  features: string[];
  highlighted: boolean;
}

export const ANNUAL_DISCOUNT_PERCENT = 20;

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 99,
    contactUsInstead: false,
    audience: "Single-warehouse distributors just getting off spreadsheets",
    features: [
      "1 warehouse",
      "Up to 500 SKUs",
      "Inventory health & reorder points",
      "Supplier OTIF scorecards",
      "Email alerts",
    ],
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 299,
    contactUsInstead: false,
    audience: "Multi-warehouse distributors ready to stop guessing on reorders",
    features: [
      "Up to 10 warehouses",
      "Unlimited SKUs",
      "Everything in Starter",
      "Cross-warehouse transfer recommendations",
      "Purchase order & price-variance tracking",
      "Logistics on-time performance",
      "AI Manager recommendations",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 0,
    contactUsInstead: true,
    audience: "Large operations with dedicated procurement and logistics teams",
    features: [
      "Unlimited warehouses",
      "Everything in Growth",
      "Custom health-score weighting",
      "SSO & role-based access",
      "Dedicated onboarding",
      "Custom SLAs",
    ],
    highlighted: false,
  },
];

/**
 * NEEDS REAL VALUES: brand/company name, live domain, contact email,
 * primary keyword, and pricing were not provided when this was built and
 * are placeholders written to be plausible, not fabricated as verified
 * facts. Update this file before launch — every marketing page, the
 * sitemap, robots.txt, and structured data all read from here.
 */
