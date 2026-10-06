/**
 * Who may add or change their own data, and which plan an org is on.
 * Reading data is never gated. In order:
 *
 * 1. The public demo org — always (its writes are simulated or rolled back),
 *    shown as Professional.
 * 2. A Polar subscription that grants access (subscriptionGrantsAccess) —
 *    on that subscription's plan, the highest if there are several.
 * 3. An org listed in IMPORT_ALLOWED_ORG_IDS (comma-separated Clerk org ids)
 *    with no granting subscription — a manual override, on Growth.
 * 4. Anyone else: "No plan", no writes. Fails closed — a missing or empty
 *    list and no subscription blocks the org.
 *
 * Pure (takes the demo check, env value, subscriptions and clock as
 * arguments) so it can be tested without Clerk or a database. Server code
 * reads it through src/lib/auth.ts.
 */

import { TIER_ORDER, getTierRank } from "@/lib/subscriptions/tiers";
import type { PlanTier } from "@/types/subscription";

export const WRITE_BLOCKED_MESSAGE = "Adding your own data needs a paid plan. Choose a plan in Settings → Billing.";
export const PLAN_CHANGE_MESSAGE = "Plans are bought through checkout and changed or cancelled in Manage billing (Settings → Billing).";

/** Days a past_due subscription (failed payment, Polar retrying) keeps write access. */
export const PAST_DUE_GRACE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The plan the demo org is shown on (unchanged from before billing). */
export const DEMO_PLAN: PlanTier = "professional";
/** The plan an allow-listed org with no subscription is on (unchanged from before billing). */
export const ALLOW_LIST_PLAN: PlanTier = "growth";

export function parseAllowedOrgIds(envValue: string | undefined): Set<string> {
  return new Set(
    (envValue ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  );
}

export function isOrgAllowListed(orgId: string, envValue: string | undefined): boolean {
  return parseAllowedOrgIds(envValue).has(orgId);
}

export function isPlanTier(value: string): value is PlanTier {
  return (TIER_ORDER as string[]).includes(value);
}

/** The fields of an org_subscriptions row the access rules need. */
export interface SubscriptionAccessFields {
  plan: PlanTier;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  endedAt: Date | null;
  pastDueSince: Date | null;
}

/**
 * Whether one Polar subscription lets its org write right now.
 * - Revoked / ended (endedAt reached): no — access stops immediately.
 * - active / trialing: yes; if the customer canceled, until currentPeriodEnd.
 * - canceled but not yet ended: yes until currentPeriodEnd.
 * - past_due: yes for PAST_DUE_GRACE_DAYS from pastDueSince, then no.
 * - Anything else (unpaid, incomplete, incomplete_expired, unknown): no.
 */
export function subscriptionGrantsAccess(sub: SubscriptionAccessFields, now: Date): boolean {
  if (sub.endedAt !== null && sub.endedAt.getTime() <= now.getTime()) return false;
  const beforePeriodEnd = sub.currentPeriodEnd === null || now.getTime() < sub.currentPeriodEnd.getTime();

  switch (sub.status) {
    case "active":
    case "trialing":
      return sub.cancelAtPeriodEnd ? beforePeriodEnd : true;
    case "canceled":
      return sub.currentPeriodEnd !== null && beforePeriodEnd;
    case "past_due":
      // pastDueSince is set by the repository the moment a row turns
      // past_due; a missing value means it only just did.
      if (sub.pastDueSince === null) return true;
      return now.getTime() < sub.pastDueSince.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS;
    default:
      return false;
  }
}

export type AccessSource = "demo" | "subscription" | "allow-list" | "none";

export interface OrgAccess {
  canWrite: boolean;
  /** null = "No plan". */
  plan: PlanTier | null;
  source: AccessSource;
}

export function resolveOrgAccess(opts: {
  orgId: string;
  isDemo: boolean;
  allowListEnv: string | undefined;
  subscriptions: SubscriptionAccessFields[];
  now: Date;
}): OrgAccess {
  if (opts.isDemo) return { canWrite: true, plan: DEMO_PLAN, source: "demo" };

  const granting = opts.subscriptions.filter((s) => subscriptionGrantsAccess(s, opts.now));
  if (granting.length > 0) {
    const plan = granting
      .map((s) => s.plan)
      .reduce((best, p) => (getTierRank(p) > getTierRank(best) ? p : best));
    return { canWrite: true, plan, source: "subscription" };
  }

  if (isOrgAllowListed(opts.orgId, opts.allowListEnv)) {
    return { canWrite: true, plan: ALLOW_LIST_PLAN, source: "allow-list" };
  }

  return { canWrite: false, plan: null, source: "none" };
}
