import type { PlanDefinition, PlanTier } from "@/types/subscription";

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Essential inventory tracking & visibility for single-facility operations.",
    monthlyPrice: 49,
    annualMonthlyPrice: 39,
    warehouseLimit: 1,
    skuLimit: 500,
    seatLimit: 3,
    monthlyAiQueries: 50,
    features: [
      "1 Warehouse facility",
      "Up to 500 SKUs",
      "Inventory tracking & balances",
      "Purchase order issuing",
      "Critical stock & delay alerts",
      "Supplier scorecards & OTIF",
      "CSV / Excel Data Importer",
      "50 AI Manager queries / month",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    tagline: "Demand forecasting, automated reorders & supplier integration.",
    monthlyPrice: 199,
    annualMonthlyPrice: 159,
    warehouseLimit: 3,
    skuLimit: 5000,
    seatLimit: 10,
    monthlyAiQueries: 500,
    highlighted: true,
    features: [
      "Everything in Starter, plus:",
      "Up to 3 Warehouses",
      "Up to 5,000 SKUs",
      "Deterministic Demand Forecasting",
      "Calculated Reorder Points & Safety Stock",
      "1-Click Suggested Purchase Orders",
      "Email & WhatsApp Instant Notifications",
      "PO Send to Supplier with PDF Export",
      "REST API (Read-Only)",
      "500 AI Manager queries / month",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    tagline: "Multi-facility network optimization, landed costs & scenario modeling.",
    monthlyPrice: 649,
    annualMonthlyPrice: 519,
    warehouseLimit: 12,
    skuLimit: 50000,
    seatLimit: -1, // unlimited
    monthlyAiQueries: 2000,
    features: [
      "Everything in Growth, plus:",
      "Up to 12 Warehouses",
      "Up to 50,000 SKUs",
      "Unlimited team seats",
      "Inter-Warehouse Transfer Recommendations",
      "Supply Chain Scenario Planning & Simulation",
      "Landed Cost & Margin Variance Analysis",
      "Multi-Tier Approval Thresholds",
      "Mobile Barcode Scanning & Receiving",
      "Batch, Lot & Expiry Date Tracking",
      "Full Read/Write Webhook & REST API",
      "Accounting & ERP Integrations",
      "2,000 AI Manager queries / month",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Enterprise-grade governance, custom workflows & dedicated support.",
    monthlyPrice: 2000,
    annualMonthlyPrice: 1600,
    warehouseLimit: -1, // unlimited
    skuLimit: -1, // unlimited
    seatLimit: -1, // unlimited
    monthlyAiQueries: 10000,
    features: [
      "Everything in Professional, plus:",
      "Unlimited Warehouses & Facilities",
      "Unlimited SKU Catalog",
      "SAML / OIDC Single Sign-On (SSO)",
      "Role-Based Access Control (RBAC)",
      "Immutable Audit Log & Compliance Export",
      "Custom Workflow & Event Automations",
      "Dedicated Account Manager",
      "99.9% Uptime SLA & 24/7 Phone Support",
    ],
  },
};

export const TIER_ORDER: PlanTier[] = ["starter", "growth", "professional", "enterprise"];

export function getTierRank(tier: PlanTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function isTierAtLeast(currentTier: PlanTier, requiredTier: PlanTier): boolean {
  return getTierRank(currentTier) >= getTierRank(requiredTier);
}
