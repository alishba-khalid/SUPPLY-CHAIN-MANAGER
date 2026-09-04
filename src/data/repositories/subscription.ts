import { prisma } from "@/lib/prisma";
import type { OrgSubscription, PlanTier, QuotaUsage, BillingCycle } from "@/types/subscription";
import { PLAN_DEFINITIONS } from "@/lib/subscriptions/tiers";

// In-memory persistent subscription store keyed by orgId
// In production, this can be synced with Stripe / Clerk billing metadata
const orgSubscriptionStore = new Map<string, OrgSubscription>();

function getInitialSubscription(orgId: string): OrgSubscription {
  const trialDays = 14;
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + trialDays);

  const isDemoOrg = orgId === "org_demo";
  const plan: PlanTier = isDemoOrg ? "professional" : "growth";
  const planDef = PLAN_DEFINITIONS[plan];

  return {
    orgId,
    plan,
    status: "trialing",
    billingCycle: "monthly",
    trialEndsAt: trialEnds.toISOString(),
    aiQueriesUsed: 14,
    aiQueriesLimit: planDef.monthlyAiQueries,
    createdAt: new Date().toISOString(),
  };
}

export async function getOrgSubscription(orgId: string): Promise<OrgSubscription> {
  let sub = orgSubscriptionStore.get(orgId);
  if (!sub) {
    sub = getInitialSubscription(orgId);
    orgSubscriptionStore.set(orgId, sub);
  }
  return sub;
}

export async function updateOrgSubscription(
  orgId: string,
  updates: { plan?: PlanTier; billingCycle?: BillingCycle },
): Promise<OrgSubscription> {
  const current = await getOrgSubscription(orgId);
  const updatedPlan = updates.plan ?? current.plan;
  const planDef = PLAN_DEFINITIONS[updatedPlan];

  const updated: OrgSubscription = {
    ...current,
    plan: updatedPlan,
    billingCycle: updates.billingCycle ?? current.billingCycle,
    aiQueriesLimit: planDef.monthlyAiQueries,
  };

  orgSubscriptionStore.set(orgId, updated);
  return updated;
}

export async function recordAiQueryUsage(orgId: string): Promise<{ success: boolean; remaining: number }> {
  const sub = await getOrgSubscription(orgId);
  const planDef = PLAN_DEFINITIONS[sub.plan];

  if (planDef.monthlyAiQueries !== -1 && sub.aiQueriesUsed >= planDef.monthlyAiQueries) {
    return { success: false, remaining: 0 };
  }

  sub.aiQueriesUsed += 1;
  orgSubscriptionStore.set(orgId, sub);
  const remaining = planDef.monthlyAiQueries === -1 ? 9999 : Math.max(0, planDef.monthlyAiQueries - sub.aiQueriesUsed);
  return { success: true, remaining };
}

export async function getOrgQuotaUsage(orgId: string): Promise<QuotaUsage> {
  const [sub, warehouseCount, productCount] = await Promise.all([
    getOrgSubscription(orgId),
    prisma.warehouse.count({ where: { orgId } }),
    prisma.product.count({ where: { orgId } }),
  ]);

  const plan = PLAN_DEFINITIONS[sub.plan];

  const warehousesOver = plan.warehouseLimit !== -1 && warehouseCount > plan.warehouseLimit;
  const skusOver = plan.skuLimit !== -1 && productCount > plan.skuLimit;
  const aiQueriesOver = plan.monthlyAiQueries !== -1 && sub.aiQueriesUsed >= plan.monthlyAiQueries;
  const aiQueriesRemaining =
    plan.monthlyAiQueries === -1 ? 9999 : Math.max(0, plan.monthlyAiQueries - sub.aiQueriesUsed);

  return {
    warehouses: {
      used: warehouseCount,
      limit: plan.warehouseLimit,
      isOverLimit: warehousesOver,
    },
    skus: {
      used: productCount,
      limit: plan.skuLimit,
      isOverLimit: skusOver,
    },
    aiQueries: {
      used: sub.aiQueriesUsed,
      limit: plan.monthlyAiQueries,
      isOverLimit: aiQueriesOver,
      remaining: aiQueriesRemaining,
    },
  };
}
