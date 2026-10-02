import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/generated/prisma/internal/prismaNamespace";
import { isPlanTier, type SubscriptionAccessFields } from "@/lib/subscriptions/write-access";
import { decideSubscriptionWrite, type PolarSubscriptionState } from "@/lib/subscriptions/subscription-sync";

/**
 * org_subscriptions: one row per Polar subscription. Written only here, by
 * the Polar webhook and the post-checkout re-sync. See
 * src/lib/subscriptions/subscription-sync.ts for the save rules.
 */

/** Every subscription row an org has, in the shape the access rules take. */
export async function listOrgSubscriptions(orgId: string): Promise<SubscriptionAccessFields[]> {
  const rows = await prisma.orgSubscription.findMany({
    where: { orgId },
    select: {
      polarSubscriptionId: true,
      plan: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      endedAt: true,
      pastDueSince: true,
    },
  });

  const result: SubscriptionAccessFields[] = [];
  for (const row of rows) {
    // The plan is written from our own product mapping, so this only fires
    // if the catalog lost a plan that rows still use — say so, don't guess.
    if (!isPlanTier(row.plan)) {
      console.error(`[billing] org ${orgId}: subscription ${row.polarSubscriptionId} has unknown plan "${row.plan}"`);
      continue;
    }
    result.push({
      plan: row.plan,
      status: row.status,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      endedAt: row.endedAt,
      pastDueSince: row.pastDueSince,
    });
  }
  return result;
}

export type SaveOutcome = "written" | "stale" | "org-mismatch";

async function saveWith(tx: TransactionClient, state: PolarSubscriptionState): Promise<SaveOutcome> {
  const stored = await tx.orgSubscription.findUnique({
    where: { polarSubscriptionId: state.polarSubscriptionId },
    select: { orgId: true, status: true, pastDueSince: true, polarModifiedAt: true },
  });

  const decision = decideSubscriptionWrite(stored, state);
  if (decision.action === "skip") return decision.reason;

  const data = {
    polarCustomerId: state.polarCustomerId,
    polarProductId: state.polarProductId,
    plan: state.plan,
    status: state.status,
    currentPeriodEnd: state.currentPeriodEnd,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    endedAt: state.endedAt,
    pastDueSince: decision.pastDueSince,
    polarModifiedAt: state.modifiedAt,
  };

  if (stored === null) {
    // A concurrent first write for the same subscription fails the unique
    // index and the whole transaction; Polar's retry then takes the update
    // path below.
    await tx.orgSubscription.create({
      data: { orgId: state.orgId, polarSubscriptionId: state.polarSubscriptionId, ...data },
    });
    return "written";
  }

  // The modified-at condition makes the "newer than stored" check atomic: if
  // a newer event landed since the read above, this updates nothing.
  const { count } = await tx.orgSubscription.updateMany({
    where: {
      polarSubscriptionId: state.polarSubscriptionId,
      orgId: state.orgId,
      polarModifiedAt: { lt: state.modifiedAt },
    },
    data,
  });
  return count === 1 ? "written" : "stale";
}

/** Save a subscription state read from the Polar API (post-checkout re-sync). */
export async function saveSubscriptionState(state: PolarSubscriptionState): Promise<SaveOutcome> {
  return prisma.$transaction((tx) => saveWith(tx, state));
}

/**
 * Apply one webhook delivery exactly once: the webhook id is recorded in the
 * same transaction as the save, so a failed save leaves no record and Polar's
 * retry is applied, while a repeated id is skipped.
 */
export async function applySubscriptionWebhook(input: {
  webhookId: string;
  type: string;
  state: PolarSubscriptionState;
}): Promise<SaveOutcome | "duplicate"> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.polarWebhookEvent.createMany({
      data: [{ webhookId: input.webhookId, type: input.type }],
      skipDuplicates: true,
    });
    if (count === 0) return "duplicate";
    return saveWith(tx, input.state);
  });
}

/** Record a webhook that changes nothing (e.g. order.paid). false = already seen. */
export async function recordWebhookEvent(webhookId: string, type: string): Promise<boolean> {
  const { count } = await prisma.polarWebhookEvent.createMany({
    data: [{ webhookId, type }],
    skipDuplicates: true,
  });
  return count === 1;
}
