import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import type { models } from "@polar-sh/sdk/2026-10";
import { handlePolarWebhook, type PolarWebhookDeps } from "@/lib/subscriptions/polar-webhook";

// A test-only secret in Polar's current (Standard Webhooks) format.
const keyBytes = randomBytes(32);
const SECRET = `whsec_${keyBytes.toString("base64")}`;

function sign(body: string, opts: { id?: string; timestamp?: number; key?: Buffer } = {}) {
  const id = opts.id ?? "msg_1";
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", opts.key ?? keyBytes).update(`${id}.${timestamp}.${body}`).digest("base64");
  return { "webhook-id": id, "webhook-timestamp": String(timestamp), "webhook-signature": `v1,${signature}` };
}

const env = { POLAR_PRODUCT_GROWTH_MONTHLY: "prod_growth" };

// What the Polar API returns for the subscription (the source of truth).
const apiSubscription = {
  id: "sub_1",
  created_at: "2026-10-02T10:00:00Z",
  modified_at: "2026-10-02T11:00:00Z",
  status: "active",
  current_period_end: "2026-11-02T10:00:00Z",
  cancel_at_period_end: false,
  ended_at: null,
  customer_id: "cus_1",
  product_id: "prod_growth",
  customer: { id: "cus_1", external_id: "org_from_api" },
} as unknown as models.Subscription;

function deps(overrides: Partial<PolarWebhookDeps> = {}) {
  const calls = { fetched: [] as string[], applied: [] as Parameters<PolarWebhookDeps["apply"]>[0][], logs: [] as string[] };
  const d: PolarWebhookDeps = {
    secret: SECRET,
    env,
    fetchSubscription: async (id) => {
      calls.fetched.push(id);
      return apiSubscription;
    },
    apply: async (input) => {
      calls.applied.push(input);
      return "written";
    },
    log: (m) => calls.logs.push(m),
    ...overrides,
  };
  return { d, calls };
}

// The body claims a different org; it must be ignored in favour of the API.
const updatedBody = JSON.stringify({
  type: "subscription.updated",
  timestamp: "2026-10-02T11:00:00Z",
  api_version: "2026-10",
  data: { id: "sub_1", customer: { external_id: "org_attacker" }, status: "active" },
});

describe("handlePolarWebhook", () => {
  test("a correctly signed subscription event is applied, with the org and state from the Polar API", async () => {
    const { d, calls } = deps();
    const res = await handlePolarWebhook(updatedBody, sign(updatedBody), d);
    assert.deepEqual(res, { status: 202, note: "written" });
    assert.deepEqual(calls.fetched, ["sub_1"]);
    assert.equal(calls.applied.length, 1);
    assert.equal(calls.applied[0].webhookId, "msg_1");
    assert.equal(calls.applied[0].state.orgId, "org_from_api");
    assert.equal(calls.applied[0].state.plan, "growth");
  });

  test("a forged signature gets 403 and nothing is read or written", async () => {
    const { d, calls } = deps();
    const res = await handlePolarWebhook(updatedBody, sign(updatedBody, { key: randomBytes(32) }), d);
    assert.equal(res.status, 403);
    assert.deepEqual(calls.fetched, []);
    assert.deepEqual(calls.applied, []);
  });

  test("a tampered body, missing headers or an old timestamp gets 403", async () => {
    const { d, calls } = deps();
    const tampered = updatedBody.replace("active", "canceled");
    assert.equal((await handlePolarWebhook(tampered, sign(updatedBody), d)).status, 403);
    assert.equal((await handlePolarWebhook(updatedBody, {}, d)).status, 403);
    const old = Math.floor(Date.now() / 1000) - 60 * 60;
    assert.equal((await handlePolarWebhook(updatedBody, sign(updatedBody, { timestamp: old }), d)).status, 403);
    assert.deepEqual(calls.applied, []);
  });

  test("a repeated delivery is acknowledged and skipped", async () => {
    const { d } = deps({ apply: async () => "duplicate" });
    assert.deepEqual(await handlePolarWebhook(updatedBody, sign(updatedBody), d), { status: 200, note: "duplicate" });
  });

  test("non-subscription and unknown event types are acknowledged and ignored", async () => {
    const { d, calls } = deps();
    const order = JSON.stringify({ type: "order.paid", timestamp: "", api_version: "2026-10", data: { id: "ord_1" } });
    assert.deepEqual(await handlePolarWebhook(order, sign(order), d), { status: 202, note: "ignored" });
    const unknown = JSON.stringify({ type: "something.new", data: {} });
    assert.deepEqual(await handlePolarWebhook(unknown, sign(unknown), d), { status: 202, note: "ignored" });
    assert.deepEqual(calls.fetched, []);
  });

  test("an unknown product or a subscription with no org is not stored, and is logged", async () => {
    const { d, calls } = deps({
      fetchSubscription: async () => ({ ...apiSubscription, product_id: "prod_other" }) as unknown as models.Subscription,
    });
    const res = await handlePolarWebhook(updatedBody, sign(updatedBody), d);
    assert.deepEqual(res, { status: 202, note: "not stored: unknown-product" });
    assert.deepEqual(calls.applied, []);
    assert.equal(calls.logs.length, 1);
  });

  test("Polar unreachable or misconfigured: 500 so Polar retries; secrets never logged", async () => {
    const failing = deps({
      fetchSubscription: async () => {
        throw Object.assign(new Error(`token ${SECRET}`), { name: "PolarServerError" });
      },
    });
    assert.equal((await handlePolarWebhook(updatedBody, sign(updatedBody), failing.d)).status, 500);
    assert.ok(failing.calls.logs.every((m) => !m.includes(SECRET)));

    assert.equal((await handlePolarWebhook(updatedBody, sign(updatedBody), deps({ fetchSubscription: null }).d)).status, 500);
    assert.equal((await handlePolarWebhook(updatedBody, sign(updatedBody), deps({ secret: null }).d)).status, 500);
  });
});
