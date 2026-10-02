import { prisma } from "@/lib/prisma";
import type { OrgSubscription, PlanTier, QuotaUsage } from "@/types/subscription";
import { PLAN_DEFINITIONS } from "@/lib/subscriptions/tiers";
import { getOrgAccess } from "@/lib/auth";

// AI-query counting is unchanged by billing and still lives in memory: it
// resets whenever a server instance restarts and starts every org at 14.
// Making it real is a separate item. An org with "No plan" keeps the AI
// allowance every org had before billing (Growth's) rather than losing it.
const AI_ALLOWANCE_PLAN_WITHOUT_PLAN: PlanTier = "growth";
const AI_QUERIES_USED_AT_START = 14;
const aiQueriesUsedStore = new Map<string, number>();

function aiAllowancePlan(plan: PlanTier | null): PlanTier {
  return plan ?? AI_ALLOWANCE_PLAN_WITHOUT_PLAN;
}

function aiQueriesUsed(orgId: string): number {
  return aiQueriesUsedStore.get(orgId) ?? AI_QUERIES_USED_AT_START;
}

/**
 * The org's plan as decided by getOrgAccess (demo, Polar subscription,
 * IMPORT_ALLOWED_ORG_IDS override, or null = "No plan").
 */
export async function getOrgSubscription(orgId: string): Promise<OrgSubscription> {
  const access = await getOrgAccess(orgId);
  return {
    orgId,
    plan: access.plan,
    source: access.source,
    aiQueriesUsed: aiQueriesUsed(orgId),
    aiQueriesLimit: PLAN_DEFINITIONS[aiAllowancePlan(access.plan)].monthlyAiQueries,
  };
}

export async function recordAiQueryUsage(orgId: string): Promise<{ success: boolean; remaining: number }> {
  const sub = await getOrgSubscription(orgId);
  const limit = sub.aiQueriesLimit;

  if (limit !== -1 && sub.aiQueriesUsed >= limit) {
    return { success: false, remaining: 0 };
  }

  const used = sub.aiQueriesUsed + 1;
  aiQueriesUsedStore.set(orgId, used);
  const remaining = limit === -1 ? 9999 : Math.max(0, limit - used);
  return { success: true, remaining };
}

export async function getOrgQuotaUsage(orgId: string): Promise<QuotaUsage> {
  const [sub, warehouseCount, productCount] = await Promise.all([
    getOrgSubscription(orgId),
    prisma.warehouse.count({ where: { orgId } }),
    prisma.product.count({ where: { orgId } }),
  ]);

  // "No plan" has no warehouse or SKU limit to show (null), not a made-up one.
  const plan = sub.plan === null ? null : PLAN_DEFINITIONS[sub.plan];
  const warehouseLimit = plan?.warehouseLimit ?? null;
  const skuLimit = plan?.skuLimit ?? null;
  const aiLimit = sub.aiQueriesLimit;

  return {
    warehouses: {
      used: warehouseCount,
      limit: warehouseLimit,
      isOverLimit: warehouseLimit !== null && warehouseLimit !== -1 && warehouseCount > warehouseLimit,
    },
    skus: {
      used: productCount,
      limit: skuLimit,
      isOverLimit: skuLimit !== null && skuLimit !== -1 && productCount > skuLimit,
    },
    aiQueries: {
      used: sub.aiQueriesUsed,
      limit: aiLimit,
      isOverLimit: aiLimit !== -1 && sub.aiQueriesUsed >= aiLimit,
      remaining: aiLimit === -1 ? 9999 : Math.max(0, aiLimit - sub.aiQueriesUsed),
    },
  };
}
