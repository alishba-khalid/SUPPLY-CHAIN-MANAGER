/**
 * How a Polar subscription state is saved to org_subscriptions — pure, so
 * the rules are tested without a database. The repository
 * (src/data/repositories/org-subscriptions.ts) applies the decision.
 *
 * Polar retries webhooks and doesn't guarantee their order, so:
 * - an event no newer than the stored row (by Polar's modified_at) is
 *   skipped — a late or repeated event can never roll the state back;
 * - a subscription is never moved to a different org;
 * - past_due_since is set the first time a row turns past_due (from the
 *   event's modified_at, not the delivery time) and cleared when it leaves.
 */

import type { PlanTier } from "@/types/subscription";

/** One Polar subscription as read from a webhook or the Polar API. */
export interface PolarSubscriptionState {
  orgId: string;
  polarSubscriptionId: string;
  polarCustomerId: string;
  polarProductId: string;
  plan: PlanTier;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  endedAt: Date | null;
  modifiedAt: Date;
}

/** The stored fields the decision depends on. */
export interface StoredSubscriptionFields {
  orgId: string;
  status: string;
  pastDueSince: Date | null;
  polarModifiedAt: Date;
}

export type SubscriptionWriteDecision =
  | { action: "write"; pastDueSince: Date | null }
  | { action: "skip"; reason: "stale" | "org-mismatch" };

export function decideSubscriptionWrite(
  stored: StoredSubscriptionFields | null,
  incoming: PolarSubscriptionState,
): SubscriptionWriteDecision {
  if (stored !== null) {
    if (stored.orgId !== incoming.orgId) return { action: "skip", reason: "org-mismatch" };
    if (incoming.modifiedAt.getTime() <= stored.polarModifiedAt.getTime()) return { action: "skip", reason: "stale" };
  }

  if (incoming.status !== "past_due") return { action: "write", pastDueSince: null };
  const alreadyPastDue = stored !== null && stored.status === "past_due" && stored.pastDueSince !== null;
  return { action: "write", pastDueSince: alreadyPastDue ? stored.pastDueSince : incoming.modifiedAt };
}
