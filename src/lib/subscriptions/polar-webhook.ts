/**
 * The Polar webhook, as a function of (raw body, headers, deps) so it can be
 * tested with real signatures and no database. The route
 * (src/app/api/polar/webhook/route.ts) passes the real dependencies.
 *
 * 1. The signature is checked by the SDK's validateEvent (Standard Webhooks:
 *    webhook-id / webhook-timestamp / webhook-signature, old timestamps
 *    rejected). Any failure -> 403, nothing read or written.
 * 2. Only subscription.* events change anything. The request body is never
 *    trusted for the org or the state: the subscription is re-read from the
 *    Polar API by id, and the org is that subscription's customer external
 *    id — which our checkout set from the signed-in session.
 * 3. The webhook id and the save are written in one transaction; a repeated
 *    id is acknowledged and skipped.
 */

import { webhooks, type models } from "@polar-sh/sdk/2026-10";
import { subscriptionStateFromPolar, describePolarError } from "@/lib/polar";
import type { PolarSubscriptionState } from "@/lib/subscriptions/subscription-sync";
import type { SaveOutcome } from "@/data/repositories/org-subscriptions";

export interface PolarWebhookDeps {
  /** POLAR_WEBHOOK_SECRET, or null if unset. */
  secret: string | null;
  env: Record<string, string | undefined>;
  /** Reads a subscription from the Polar API; null if Polar isn't configured. */
  fetchSubscription: ((id: string) => Promise<models.Subscription>) | null;
  apply: (input: { webhookId: string; type: string; state: PolarSubscriptionState }) => Promise<SaveOutcome | "duplicate">;
  log: (message: string) => void;
}

export interface WebhookResult {
  status: number;
  /** Short plain-text reason for the response body; never contains a secret. */
  note: string;
}

export async function handlePolarWebhook(
  body: string,
  headers: Record<string, string>,
  deps: PolarWebhookDeps,
): Promise<WebhookResult> {
  if (deps.secret === null) {
    deps.log("[billing] webhook received but POLAR_WEBHOOK_SECRET is not set");
    // Not 403: this is our misconfiguration, so Polar should retry once fixed.
    return { status: 500, note: "webhook not configured" };
  }

  let event: Awaited<ReturnType<typeof webhooks.validateEvent>>;
  try {
    event = await webhooks.validateEvent(body, headers, deps.secret);
  } catch (err) {
    if (err instanceof webhooks.PolarWebhookVerificationError) {
      return { status: 403, note: "invalid signature" };
    }
    if (err instanceof webhooks.PolarWebhookUnknownTypeError) {
      // Signed by Polar (the signature is checked first) but not a type we use.
      return { status: 202, note: "ignored" };
    }
    return { status: 400, note: "unreadable payload" };
  }

  if (!event.type.startsWith("subscription.")) return { status: 202, note: "ignored" };

  const webhookId = Object.entries(headers).find(([key]) => key.toLowerCase() === "webhook-id")?.[1];
  if (!webhookId) return { status: 403, note: "invalid signature" };

  const subscriptionId = (event.data as { id?: unknown }).id;
  if (typeof subscriptionId !== "string" || subscriptionId.length === 0) {
    return { status: 400, note: "no subscription id" };
  }

  if (deps.fetchSubscription === null) {
    deps.log("[billing] webhook can't re-read the subscription: Polar API env vars are not set");
    return { status: 500, note: "billing not configured" };
  }

  let subscription: models.Subscription;
  try {
    subscription = await deps.fetchSubscription(subscriptionId);
  } catch (err) {
    deps.log(`[billing] webhook ${event.type}: reading subscription ${subscriptionId} failed: ${describePolarError(err)}`);
    return { status: 500, note: "could not read subscription" };
  }

  const converted = subscriptionStateFromPolar(subscription, deps.env);
  if (!converted.ok) {
    // Retrying won't help; say loudly so a paying customer isn't silently missed.
    deps.log(`[billing] webhook ${event.type}: subscription ${subscriptionId} not stored (${converted.reason})`);
    return { status: 202, note: `not stored: ${converted.reason}` };
  }

  const outcome = await deps.apply({ webhookId, type: event.type, state: converted.state });
  if (outcome === "org-mismatch") {
    deps.log(`[billing] webhook ${event.type}: subscription ${subscriptionId} belongs to another org; not moved`);
  }
  return { status: outcome === "duplicate" ? 200 : 202, note: outcome };
}
