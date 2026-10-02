import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { models } from "@polar-sh/sdk/2026-10";
import {
  getPolarClient,
  planForProductId,
  polarEnvironment,
  productIdForPlan,
  subscriptionStateFromPolar,
} from "@/lib/polar";

const env = {
  POLAR_PRODUCT_STARTER_MONTHLY: "prod_starter",
  POLAR_PRODUCT_GROWTH_MONTHLY: "prod_growth",
  POLAR_PRODUCT_PROFESSIONAL_MONTHLY: "prod_pro",
};

describe("productIdForPlan", () => {
  test("each self-serve plan maps to its env var", () => {
    assert.deepEqual(productIdForPlan("starter", env), { ok: true, productId: "prod_starter" });
    assert.deepEqual(productIdForPlan("growth", env), { ok: true, productId: "prod_growth" });
    assert.deepEqual(productIdForPlan("professional", env), { ok: true, productId: "prod_pro" });
  });

  test("a missing or blank product id refuses checkout instead of guessing", () => {
    assert.deepEqual(productIdForPlan("growth", {}), { ok: false, refusal: "not-configured" });
    assert.deepEqual(productIdForPlan("growth", { POLAR_PRODUCT_GROWTH_MONTHLY: "  " }), {
      ok: false,
      refusal: "not-configured",
    });
  });

  test("Enterprise is contact-us, never a checkout", () => {
    assert.deepEqual(productIdForPlan("enterprise", env), { ok: false, refusal: "contact-us" });
  });
});

describe("planForProductId", () => {
  test("finds the plan a product is configured for", () => {
    assert.equal(planForProductId("prod_pro", env), "professional");
  });

  test("an unknown product, or one configured for two plans, maps to nothing", () => {
    assert.equal(planForProductId("prod_other", env), null);
    assert.equal(planForProductId("prod_x", { ...env, POLAR_PRODUCT_STARTER_MONTHLY: "prod_x", POLAR_PRODUCT_GROWTH_MONTHLY: "prod_x" }), null);
  });
});

describe("Polar client config", () => {
  test("POLAR_ENVIRONMENT must be exactly sandbox or production", () => {
    assert.equal(polarEnvironment({ POLAR_ENVIRONMENT: "sandbox" }), "sandbox");
    assert.equal(polarEnvironment({ POLAR_ENVIRONMENT: "production" }), "production");
    assert.equal(polarEnvironment({ POLAR_ENVIRONMENT: "live" }), null);
    assert.equal(polarEnvironment({}), null);
  });

  test("missing settings are reported by name only", () => {
    const res = getPolarClient({});
    assert.equal(res.ok, false);
    if (!res.ok) assert.deepEqual(res.missing, ["POLAR_ACCESS_TOKEN", "POLAR_ENVIRONMENT (sandbox | production)"]);
    assert.equal(getPolarClient({ POLAR_ACCESS_TOKEN: "t", POLAR_ENVIRONMENT: "sandbox" }).ok, true);
  });
});

describe("subscriptionStateFromPolar", () => {
  const sub = {
    id: "sub_1",
    created_at: "2026-10-02T10:00:00Z",
    modified_at: "2026-10-02T11:00:00Z",
    status: "active",
    current_period_end: "2026-11-02T10:00:00Z",
    cancel_at_period_end: false,
    ended_at: null,
    customer_id: "cus_1",
    product_id: "prod_growth",
    customer: { id: "cus_1", external_id: "org_a" },
  } as unknown as models.Subscription;

  test("maps a Polar subscription to the stored state", () => {
    assert.deepEqual(subscriptionStateFromPolar(sub, env), {
      ok: true,
      state: {
        orgId: "org_a",
        polarSubscriptionId: "sub_1",
        polarCustomerId: "cus_1",
        polarProductId: "prod_growth",
        plan: "growth",
        status: "active",
        currentPeriodEnd: new Date("2026-11-02T10:00:00Z"),
        cancelAtPeriodEnd: false,
        endedAt: null,
        modifiedAt: new Date("2026-10-02T11:00:00Z"),
      },
    });
  });

  test("no external id (org) or an unknown product is refused, not guessed", () => {
    const noOrg = { ...sub, customer: { id: "cus_1", external_id: null } } as unknown as models.Subscription;
    assert.deepEqual(subscriptionStateFromPolar(noOrg, env), { ok: false, reason: "no-org" });
    const other = { ...sub, product_id: "prod_other" } as unknown as models.Subscription;
    assert.deepEqual(subscriptionStateFromPolar(other, env), { ok: false, reason: "unknown-product" });
  });

  test("a never-modified subscription uses its creation time", () => {
    const fresh = { ...sub, modified_at: null } as unknown as models.Subscription;
    const res = subscriptionStateFromPolar(fresh, env);
    assert.ok(res.ok);
    if (res.ok) assert.deepEqual(res.state.modifiedAt, new Date("2026-10-02T10:00:00Z"));
  });
});
