import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PLAN_DEFINITIONS, TIER_ORDER } from "@/lib/subscriptions/tiers";
import { PRICING_TIERS, STARTING_MONTHLY_PRICE } from "@/lib/site-config";

describe("plan catalog", () => {
  test("prices are pinned: changing one must be a deliberate edit to this test", () => {
    assert.equal(PLAN_DEFINITIONS.starter.monthlyPrice, 49);
    assert.equal(PLAN_DEFINITIONS.growth.monthlyPrice, 199);
    assert.equal(PLAN_DEFINITIONS.professional.monthlyPrice, 649);
    assert.equal(PLAN_DEFINITIONS.enterprise.monthlyPrice, 2000);
    assert.equal(STARTING_MONTHLY_PRICE, 49);
  });

  test("Enterprise is contact-us; every other plan is self-serve", () => {
    assert.equal(PLAN_DEFINITIONS.enterprise.contactUsInstead, true);
    for (const id of ["starter", "growth", "professional"] as const) {
      assert.equal(PLAN_DEFINITIONS[id].contactUsInstead, false, id);
    }
  });

  test("the marketing tiers are the catalog, in tier order, not a copy", () => {
    assert.deepEqual(
      PRICING_TIERS.map((t) => t.id),
      TIER_ORDER,
    );
    for (const tier of PRICING_TIERS) {
      const plan = PLAN_DEFINITIONS[tier.id as keyof typeof PLAN_DEFINITIONS];
      assert.equal(tier.name, plan.name);
      assert.equal(tier.monthlyPrice, plan.monthlyPrice);
      assert.equal(tier.contactUsInstead, plan.contactUsInstead);
      assert.equal(tier.audience, plan.audience);
      assert.equal(tier.features, plan.features);
    }
  });

  test("plan cards list only what the app does today", () => {
    for (const id of TIER_ORDER) {
      for (const feature of PLAN_DEFINITIONS[id].features) {
        assert.doesNotMatch(feature, /coming soon/i, `${id}: ${feature}`);
        assert.doesNotMatch(feature, /AI .*quer/i, `${id}: ${feature}`);
        assert.doesNotMatch(feature, /\b(3|10) team seats\b/i, `${id}: ${feature}`);
        assert.doesNotMatch(feature, /account manager|SLA/i, `${id}: ${feature}`);
      }
    }
  });
});
