import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  PAST_DUE_GRACE_DAYS,
  isPlanTier,
  resolveOrgAccess,
  subscriptionGrantsAccess,
  type SubscriptionAccessFields,
} from "@/lib/subscriptions/write-access";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-15T12:00:00Z");
const daysFromNow = (d: number) => new Date(now.getTime() + d * DAY);

function sub(overrides: Partial<SubscriptionAccessFields>): SubscriptionAccessFields {
  return {
    plan: "growth",
    status: "active",
    currentPeriodEnd: daysFromNow(20),
    cancelAtPeriodEnd: false,
    endedAt: null,
    pastDueSince: null,
    ...overrides,
  };
}

describe("subscriptionGrantsAccess", () => {
  test("active and trialing grant access", () => {
    assert.equal(subscriptionGrantsAccess(sub({ status: "active" }), now), true);
    assert.equal(subscriptionGrantsAccess(sub({ status: "trialing" }), now), true);
  });

  test("canceled by the customer keeps access until the period ends", () => {
    assert.equal(subscriptionGrantsAccess(sub({ cancelAtPeriodEnd: true, currentPeriodEnd: daysFromNow(3) }), now), true);
    assert.equal(subscriptionGrantsAccess(sub({ cancelAtPeriodEnd: true, currentPeriodEnd: daysFromNow(-1) }), now), false);
    assert.equal(subscriptionGrantsAccess(sub({ status: "canceled", currentPeriodEnd: daysFromNow(3) }), now), true);
    assert.equal(subscriptionGrantsAccess(sub({ status: "canceled", currentPeriodEnd: daysFromNow(-1) }), now), false);
  });

  test("revoked (ended) cuts access immediately, even mid-period", () => {
    assert.equal(
      subscriptionGrantsAccess(sub({ status: "canceled", endedAt: daysFromNow(-0.01), currentPeriodEnd: daysFromNow(20) }), now),
      false,
    );
    assert.equal(subscriptionGrantsAccess(sub({ status: "active", endedAt: now }), now), false);
  });

  test(`past_due keeps access for ${PAST_DUE_GRACE_DAYS} days, then restricts`, () => {
    assert.equal(PAST_DUE_GRACE_DAYS, 7);
    assert.equal(subscriptionGrantsAccess(sub({ status: "past_due", pastDueSince: daysFromNow(-6) }), now), true);
    assert.equal(subscriptionGrantsAccess(sub({ status: "past_due", pastDueSince: daysFromNow(-6.99) }), now), true);
    assert.equal(subscriptionGrantsAccess(sub({ status: "past_due", pastDueSince: daysFromNow(-7) }), now), false);
    assert.equal(subscriptionGrantsAccess(sub({ status: "past_due", pastDueSince: daysFromNow(-8) }), now), false);
  });

  test("unpaid, incomplete and unknown statuses don't grant access", () => {
    for (const status of ["unpaid", "incomplete", "incomplete_expired", "something_new"]) {
      assert.equal(subscriptionGrantsAccess(sub({ status }), now), false, status);
    }
  });
});

describe("resolveOrgAccess", () => {
  const base = { orgId: "org_a", isDemo: false, allowListEnv: undefined, subscriptions: [], now };

  test("the demo org can write, on Professional", () => {
    assert.deepEqual(resolveOrgAccess({ ...base, isDemo: true }), { canWrite: true, plan: "professional", source: "demo" });
  });

  test("an org that never paid and isn't listed: No plan, no writes", () => {
    assert.deepEqual(resolveOrgAccess(base), { canWrite: false, plan: null, source: "none" });
  });

  test("an allow-listed org with no subscription keeps Growth, as an override", () => {
    assert.deepEqual(resolveOrgAccess({ ...base, allowListEnv: "org_x, org_a" }), {
      canWrite: true,
      plan: "growth",
      source: "allow-list",
    });
  });

  test("a granting subscription wins over the allow-list and sets the plan", () => {
    const access = resolveOrgAccess({ ...base, allowListEnv: "org_a", subscriptions: [sub({ plan: "starter" })] });
    assert.deepEqual(access, { canWrite: true, plan: "starter", source: "subscription" });
  });

  test("with several subscriptions, any granting one counts and the highest plan wins", () => {
    const access = resolveOrgAccess({
      ...base,
      subscriptions: [
        sub({ plan: "professional", status: "canceled", endedAt: daysFromNow(-30), currentPeriodEnd: daysFromNow(-30) }),
        sub({ plan: "starter" }),
        sub({ plan: "growth", status: "past_due", pastDueSince: daysFromNow(-2) }),
      ],
    });
    assert.deepEqual(access, { canWrite: true, plan: "growth", source: "subscription" });
  });

  test("a lapsed org falls back to the allow-list if listed, otherwise No plan", () => {
    const lapsed = [sub({ status: "canceled", endedAt: daysFromNow(-1), currentPeriodEnd: daysFromNow(-1) })];
    assert.equal(resolveOrgAccess({ ...base, subscriptions: lapsed }).source, "none");
    assert.equal(resolveOrgAccess({ ...base, subscriptions: lapsed, allowListEnv: "org_a" }).source, "allow-list");
  });
});

test("isPlanTier accepts only catalog plans", () => {
  assert.equal(isPlanTier("growth"), true);
  assert.equal(isPlanTier("enterprise"), true);
  assert.equal(isPlanTier("free"), false);
  assert.equal(isPlanTier(""), false);
});
