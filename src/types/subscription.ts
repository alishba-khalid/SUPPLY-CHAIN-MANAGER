export type PlanTier = "starter" | "growth" | "professional" | "enterprise";

export type BillingCycle = "monthly" | "annual";

export type SubscriptionStatus = "trialing" | "active" | "canceled" | "past_due";

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
  monthlyPrice: number;
  annualMonthlyPrice: number; // e.g. $39/mo ($468 billed annually)
  warehouseLimit: number; // -1 for unlimited
  skuLimit: number; // -1 for unlimited
  seatLimit: number; // -1 for unlimited
  monthlyAiQueries: number; // -1 for custom/unlimited
  features: string[];
  highlighted?: boolean;
}

export interface OrgSubscription {
  orgId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialEndsAt: string; // ISO Date string
  aiQueriesUsed: number;
  aiQueriesLimit: number;
  createdAt: string;
}

export interface QuotaUsage {
  warehouses: {
    used: number;
    limit: number;
    isOverLimit: boolean;
  };
  skus: {
    used: number;
    limit: number;
    isOverLimit: boolean;
  };
  aiQueries: {
    used: number;
    limit: number;
    isOverLimit: boolean;
    remaining: number;
  };
}
