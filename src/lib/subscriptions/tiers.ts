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
      "Email & WhatsApp Instant Notifications (coming soon)",
      "PO Send to Supplier with PDF Export (coming soon)",
      "REST API (Read-Only) (coming soon)",
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
      "Supply Chain Scenario Planning & Simulation (coming soon)",
      "Landed Cost & Margin Variance Analysis (coming soon)",
      "Multi-Tier Approval Thresholds (coming soon)",
      "Mobile Barcode Scanning & Receiving (coming soon)",
      "Batch, Lot & Expiry Date Tracking (coming soon)",
      "Full Read/Write Webhook & REST API (coming soon)",
      "Accounting & ERP Integrations (coming soon)",
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
      "SAML / OIDC Single Sign-On (SSO) (coming soon)",
      "Role-Based Access Control (RBAC) (coming soon)",
      "Immutable Audit Log & Compliance Export (coming soon)",
      "Custom Workflow & Event Automations (coming soon)",
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
