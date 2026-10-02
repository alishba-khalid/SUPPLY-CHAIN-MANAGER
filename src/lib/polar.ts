/**
 * Polar (merchant of record) configuration, read from env vars only:
 *   POLAR_ACCESS_TOKEN, POLAR_WEBHOOK_SECRET,
 *   POLAR_ENVIRONMENT ("sandbox" on Preview, "production" on Production),
 *   POLAR_PRODUCT_STARTER_MONTHLY, POLAR_PRODUCT_GROWTH_MONTHLY,
 *   POLAR_PRODUCT_PROFESSIONAL_MONTHLY.
 * Never log or return a token or secret — only say which variable is missing.
 *
 * The pure helpers take the env as an argument so they're tested without
 * Polar; server code passes process.env.
 */

import { createPolar, type Environment, type Polar, type models } from "@polar-sh/sdk/2026-10";
import { PLAN_DEFINITIONS } from "@/lib/subscriptions/tiers";
import type { PolarSubscriptionState } from "@/lib/subscriptions/subscription-sync";
import type { PlanTier } from "@/types/subscription";

type Env = Record<string, string | undefined>;

/** Plans bought through Polar checkout. Enterprise is contact-us. */
export type SelfServePlan = "starter" | "growth" | "professional";

export const POLAR_PRODUCT_ENV_VARS: Record<SelfServePlan, string> = {
  starter: "POLAR_PRODUCT_STARTER_MONTHLY",
  growth: "POLAR_PRODUCT_GROWTH_MONTHLY",
  professional: "POLAR_PRODUCT_PROFESSIONAL_MONTHLY",
};

export function isSelfServePlan(plan: PlanTier): plan is SelfServePlan {
  return plan in POLAR_PRODUCT_ENV_VARS && !PLAN_DEFINITIONS[plan].contactUsInstead;
}

function envValue(env: Env, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

/** Why checkout can't start. The message is shown to the customer as-is. */
export type CheckoutRefusal = "not-configured" | "contact-us" | "demo" | "invalid-plan" | "polar-error";

export function productIdForPlan(
  plan: PlanTier,
  env: Env,
): { ok: true; productId: string } | { ok: false; refusal: CheckoutRefusal } {
  if (!isSelfServePlan(plan)) return { ok: false, refusal: "contact-us" };
  const productId = envValue(env, POLAR_PRODUCT_ENV_VARS[plan]);
  if (productId === null) return { ok: false, refusal: "not-configured" };
  return { ok: true, productId };
}

/**
 * The plan a Polar product id is configured for, or null if it isn't one of
 * ours — or is configured for more than one plan (a mistake we refuse to
 * guess through).
 */
export function planForProductId(productId: string, env: Env): SelfServePlan | null {
  const matches = (Object.keys(POLAR_PRODUCT_ENV_VARS) as SelfServePlan[]).filter(
    (plan) => envValue(env, POLAR_PRODUCT_ENV_VARS[plan]) === productId,
  );
  return matches.length === 1 ? matches[0] : null;
}

export function polarEnvironment(env: Env): Environment | null {
  const value = envValue(env, "POLAR_ENVIRONMENT");
  return value === "sandbox" || value === "production" ? value : null;
}

/**
 * A Polar API client, or the names of the env vars that are missing.
 * POLAR_ENVIRONMENT must be set explicitly so a Preview can never talk to
 * live Polar by default.
 */
export function getPolarClient(env: Env = process.env): { ok: true; polar: Polar } | { ok: false; missing: string[] } {
  const accessToken = envValue(env, "POLAR_ACCESS_TOKEN");
  const environment = polarEnvironment(env);
  const missing = [
    ...(accessToken === null ? ["POLAR_ACCESS_TOKEN"] : []),
    ...(environment === null ? ["POLAR_ENVIRONMENT (sandbox | production)"] : []),
  ];
  if (accessToken === null || environment === null) return { ok: false, missing };
  return { ok: true, polar: createPolar({ accessToken, environment }) };
}

/**
 * A Polar subscription as we store it. The org is the customer's external
 * id, which our checkout set from the signed-in session; the plan comes from
 * our own product mapping. Returns why it can't be stored otherwise.
 */
export function subscriptionStateFromPolar(
  sub: models.Subscription,
  env: Env,
): { ok: true; state: PolarSubscriptionState } | { ok: false; reason: "no-org" | "unknown-product" } {
  const orgId = sub.customer.external_id?.trim();
  if (!orgId) return { ok: false, reason: "no-org" };
  const plan = planForProductId(sub.product_id, env);
  if (plan === null) return { ok: false, reason: "unknown-product" };

  return {
    ok: true,
    state: {
      orgId,
      polarSubscriptionId: sub.id,
      polarCustomerId: sub.customer_id,
      polarProductId: sub.product_id,
      plan,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      endedAt: sub.ended_at ? new Date(sub.ended_at) : null,
      modifiedAt: new Date(sub.modified_at ?? sub.created_at),
    },
  };
}
