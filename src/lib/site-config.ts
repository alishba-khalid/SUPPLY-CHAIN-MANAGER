/**
 * Marketing-site facts (brand, domain, pricing, copy). Everything here is a
 * placeholder pending real business decisions — see the note at the bottom
 * of this file — but is centralized so it only needs to change in one
 * place. Never invented: dashboard data, module capabilities, and feature
 * copy are all derived from the real app (src/lib, src/data/repositories,
 * src/app/(app)/dashboard).
 */

export const SITE_NAME = "Supply Chain Manager";
// Single source of truth for the site's canonical URL. Everything that
// needs it (canonical tags, og:url, sitemap.xml, robots.txt, structured
// data, metadataBase) imports SITE_URL from here rather than hardcoding
// the domain — override via NEXT_PUBLIC_SITE_URL for previews/local dev.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://supplychainmanager.app";
export const CONTACT_EMAIL = "alishbakhalid76@gmail.com";
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
    monthlyPrice: 49,
    contactUsInstead: false,
    audience: "Single-warehouse operations getting off spreadsheets",
    features: [
      "1 warehouse",
      "Up to 500 SKUs",
      "3 team seats",
      "Inventory tracking & alerts",
      "Supplier scorecards & OTIF",
      "CSV / Excel Data Importer",
      "50 AI Manager queries / mo",
    ],
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 199,
    contactUsInstead: false,
    audience: "Growing operations automating reorders & forecasting",
    features: [
      "Up to 3 warehouses",
      "Up to 5,000 SKUs",
      "10 team seats",
      "Demand forecasting & safety stock",
      "1-Click Suggested Purchase Orders",
      "Email & WhatsApp alerts (coming soon)",
      "PO Send to Supplier with PDF (coming soon)",
      "500 AI Manager queries / mo",
    ],
    highlighted: true,
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPrice: 649,
    contactUsInstead: false,
    audience: "Multi-facility networks optimizing transfers & margins",
    features: [
      "Up to 12 warehouses",
      "Up to 50,000 SKUs",
      "Unlimited team seats",
      "Inter-warehouse transfer recommendations",
      "Landed cost & scenario modeling (coming soon)",
      "Batch, lot & expiry tracking (coming soon)",
      "Full API & ERP integration (coming soon)",
      "2,000 AI queries / mo (14-day trial)",
    ],
    highlighted: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 2000,
    contactUsInstead: true,
    audience: "Large enterprises requiring governance and custom workflows",
    features: [
      "Unlimited warehouses & SKUs",
      "Unlimited team seats",
      "SAML / OIDC Single Sign-On (SSO) (coming soon)",
      "Role-Based Access Control & Audit Log (coming soon)",
      "Custom workflow automations (coming soon)",
      "Dedicated account manager & SLA",
    ],
    highlighted: false,
  },
];

/**
 * NEEDS REAL VALUES: brand/company name, contact email, primary keyword,
 * and pricing were not provided when this was built and are placeholders
 * written to be plausible, not fabricated as verified facts. SITE_URL is
 * the one confirmed real value — supplychainmanager.app is purchased and
 * pointed at Vercel. Update the rest of this file before launch — every
 * marketing page, the sitemap, robots.txt, and structured data all read
 * from here.
 */
