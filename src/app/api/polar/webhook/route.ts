import { getPolarClient } from "@/lib/polar";
import { handlePolarWebhook } from "@/lib/subscriptions/polar-webhook";
import { applySubscriptionWebhook } from "@/data/repositories/org-subscriptions";

/**
 * POST /api/polar/webhook — Polar subscription events. Signature checked
 * before anything is read (403 on failure); the org and state are re-read
 * from the Polar API, never taken from the body; duplicates are skipped.
 * See src/lib/subscriptions/polar-webhook.ts.
 */
export async function POST(request: Request) {
  // The raw text is what Polar signed — read it before anything parses it.
  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());
  const client = getPolarClient();

  try {
    const result = await handlePolarWebhook(body, headers, {
      secret: process.env.POLAR_WEBHOOK_SECRET?.trim() || null,
      env: process.env,
      fetchSubscription: client.ok ? (id) => client.polar.subscriptions.get(id) : null,
      apply: applySubscriptionWebhook,
      log: (message) => console.error(message),
    });
    return new Response(result.note, { status: result.status });
  } catch (err) {
    // A database failure: 500 so Polar retries. The webhook id was not
    // recorded (same transaction), so the retry is applied in full.
    console.error(`[billing] webhook failed: ${err instanceof Error ? err.name : "unknown error"}`);
    return new Response("temporary failure", { status: 500 });
  }
}
