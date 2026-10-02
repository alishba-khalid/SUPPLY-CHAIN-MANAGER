import type { PlanDefinition, PlanTier } from "@/types/subscription";

// The one plan catalog: prices, limits and the feature list shown on every
// plan card (marketing pricing, the in-app Billing view and the plan screen).
// Each card lists only what the app does today. Warehouse and SKU limits are
// shown but not yet enforced; seats and AI-query allowances are not listed.
export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Essential inventory tracking & visibility for single-facility operations.",
    audience: "Single-warehouse operations getting off spreadsheets",
    contactUsInstead: false,
    monthlyPrice: 49,
    annualMonthlyPrice: 39,
    warehouseLimit: 1,
    skuLimit: 500,
    seatLimit: 3,
    monthlyAiQueries: 50,
    importRowLimit: 100_000,
    features: [
      "1 warehouse",
      "Up to 500 SKUs",
      "Inventory tracking & alerts",
      "Supplier scorecards & OTIF",
      "CSV / Excel Data Importer",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    tagline: "Demand forecasting, automated reorders & supplier integration.",
    audience: "Growing operations automating reorders & forecasting",
    contactUsInstead: false,
    monthlyPrice: 199,
    annualMonthlyPrice: 159,
    warehouseLimit: 3,
    skuLimit: 5000,
    seatLimit: 10,
    monthlyAiQueries: 500,
    importRowLimit: 500_000,
    highlighted: true,
    features: [
      "Everything in Starter, plus:",
      "Up to 3 warehouses",
      "Up to 5,000 SKUs",
      "Demand forecasting & safety stock",
      "1-Click Suggested Purchase Orders",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    tagline: "Multi-facility network optimization, landed costs & scenario modeling.",
    audience: "Multi-facility networks optimizing transfers & margins",
    contactUsInstead: false,
    monthlyPrice: 649,
    annualMonthlyPrice: 519,
    warehouseLimit: 12,
    skuLimit: 50000,
    seatLimit: -1, // unlimited
    monthlyAiQueries: 2000,
    importRowLimit: 2_000_000,
    features: [
      "Everything in Growth, plus:",
      "Up to 12 warehouses",
      "Up to 50,000 SKUs",
      "Unlimited team seats",
      "Inter-warehouse transfer recommendations",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Enterprise-grade governance, custom workflows & dedicated support.",
    audience: "Large enterprises requiring governance and custom workflows",
    contactUsInstead: true,
    monthlyPrice: 2000,
    annualMonthlyPrice: 1600,
    warehouseLimit: -1, // unlimited
    skuLimit: -1, // unlimited
    seatLimit: -1, // unlimited
    monthlyAiQueries: 10000,
    importRowLimit: 2_000_000,
    features: [
      "Everything in Professional, plus:",
      "Unlimited warehouses & SKUs",
      "Unlimited team seats",
    ],
  },
};

// Rows per single import while an org is on the public demo or still in its
// trial — paid plans use their own `importRowLimit` above. A per-org
// override (organizations.import_row_limit_override) beats both.
export const TRIAL_IMPORT_ROW_LIMIT = 50_000;

export function resolveImportRowLimit(opts: {
  plan: PlanTier;
  isDemoOrTrial: boolean;
  orgOverride?: number | null;
}): number {
  if (opts.orgOverride != null && opts.orgOverride > 0) return opts.orgOverride;
  if (opts.isDemoOrTrial) return TRIAL_IMPORT_ROW_LIMIT;
  return PLAN_DEFINITIONS[opts.plan].importRowLimit;
}

export const TIER_ORDER: PlanTier[] = ["starter", "growth", "professional", "enterprise"];

export function getTierRank(tier: PlanTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function isTierAtLeast(currentTier: PlanTier, requiredTier: PlanTier): boolean {
  return getTierRank(currentTier) >= getTierRank(requiredTier);
}
