export type PlanTier = "starter" | "growth" | "professional" | "enterprise";

export type BillingCycle = "monthly" | "annual";

// Where an org's plan comes from — see src/lib/subscriptions/write-access.ts.
export type PlanSource = "demo" | "subscription" | "allow-list" | "none";

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  tierRequired: PlanTier;
}

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  tagline: string;
  audience: string; // who the plan is for, shown on the plan card
  contactUsInstead: boolean; // true: no self-serve checkout, priced "From $X"
  monthlyPrice: number;
  annualMonthlyPrice: number; // e.g. $39/mo ($468 billed annually)
  warehouseLimit: number; // -1 for unlimited
  skuLimit: number; // -1 for unlimited
  seatLimit: number; // -1 for unlimited
  monthlyAiQueries: number; // -1 for custom/unlimited
  importRowLimit: number; // max rows per single smart import
  features: string[];
  highlighted?: boolean;
}

export interface OrgSubscription {
  orgId: string;
  plan: PlanTier | null; // null = "No plan"
  source: PlanSource;
  aiQueriesUsed: number;
  aiQueriesLimit: number;
}

export interface QuotaUsage {
  warehouses: {
    used: number;
    limit: number | null; // null = no plan, -1 = unlimited
    isOverLimit: boolean;
  };
  skus: {
    used: number;
    limit: number | null; // null = no plan, -1 = unlimited
    isOverLimit: boolean;
  };
  aiQueries: {
    used: number;
    limit: number;
    isOverLimit: boolean;
    remaining: number;
  };
}
