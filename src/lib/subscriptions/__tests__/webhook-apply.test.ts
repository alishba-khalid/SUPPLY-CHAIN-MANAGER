import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { decideSubscriptionWrite, type PolarSubscriptionState } from "@/lib/subscriptions/subscription-sync";

const t = (iso: string) => new Date(iso);

function incoming(overrides: Partial<PolarSubscriptionState>): PolarSubscriptionState {
  return {
    orgId: "org_a",
    polarSubscriptionId: "sub_1",
    polarCustomerId: "cus_1",
    polarProductId: "prod_growth",
    plan: "growth",
    status: "active",
    currentPeriodEnd: t("2026-11-01T00:00:00Z"),
    cancelAtPeriodEnd: false,
    endedAt: null,
    modifiedAt: t("2026-10-02T10:00:00Z"),
    ...overrides,
  };
}

const stored = (overrides: Partial<{ orgId: string; status: string; pastDueSince: Date | null; polarModifiedAt: Date }>) => ({
  orgId: "org_a",
  status: "active",
  pastDueSince: null,
  polarModifiedAt: t("2026-10-02T10:00:00Z"),
  ...overrides,
});

describe("decideSubscriptionWrite", () => {
  test("a first event for a subscription is written", () => {
    assert.deepEqual(decideSubscriptionWrite(null, incoming({})), { action: "write", pastDueSince: null });
  });

  test("the same event delivered twice is skipped the second time", () => {
    assert.deepEqual(decideSubscriptionWrite(stored({}), incoming({})), { action: "skip", reason: "stale" });
  });

  test("an older event arriving late can't roll the state back", () => {
    const late = incoming({ status: "active", modifiedAt: t("2026-10-02T09:00:00Z") });
    assert.deepEqual(decideSubscriptionWrite(stored({ status: "canceled" }), late), { action: "skip", reason: "stale" });
  });

  test("a newer event is written", () => {
    const newer = incoming({ status: "canceled", endedAt: t("2026-10-02T11:00:00Z"), modifiedAt: t("2026-10-02T11:00:00Z") });
    assert.equal(decideSubscriptionWrite(stored({}), newer).action, "write");
  });

  test("a subscription is never moved to another org", () => {
    const other = incoming({ orgId: "org_b", modifiedAt: t("2026-10-03T00:00:00Z") });
    assert.deepEqual(decideSubscriptionWrite(stored({}), other), { action: "skip", reason: "org-mismatch" });
  });

  test("past_due starts the grace clock at the event's time, once", () => {
    const first = incoming({ status: "past_due", modifiedAt: t("2026-10-05T08:00:00Z") });
    assert.deepEqual(decideSubscriptionWrite(stored({}), first), {
      action: "write",
      pastDueSince: t("2026-10-05T08:00:00Z"),
    });

    const again = incoming({ status: "past_due", modifiedAt: t("2026-10-07T08:00:00Z") });
    const since = t("2026-10-05T08:00:00Z");
    assert.deepEqual(
      decideSubscriptionWrite(stored({ status: "past_due", pastDueSince: since, polarModifiedAt: since }), again),
      { action: "write", pastDueSince: since },
    );
  });

  test("leaving past_due clears the grace clock", () => {
    const since = t("2026-10-05T08:00:00Z");
    const paid = incoming({ status: "active", modifiedAt: t("2026-10-06T08:00:00Z") });
    assert.deepEqual(
      decideSubscriptionWrite(stored({ status: "past_due", pastDueSince: since, polarModifiedAt: since }), paid),
      { action: "write", pastDueSince: null },
    );
  });
});
