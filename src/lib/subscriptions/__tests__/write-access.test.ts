import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isOrgWriteAllowed, parseAllowedOrgIds } from "@/lib/subscriptions/write-access";

describe("isOrgWriteAllowed", () => {
  test("the demo org can always write (its writes are simulated or rolled back)", () => {
    assert.equal(isOrgWriteAllowed({ orgId: "org_demo", isDemo: true, envValue: undefined }), true);
  });

  test("fails closed: a missing or empty list blocks every non-demo org", () => {
    assert.equal(isOrgWriteAllowed({ orgId: "org_a", isDemo: false, envValue: undefined }), false);
    assert.equal(isOrgWriteAllowed({ orgId: "org_a", isDemo: false, envValue: "" }), false);
    assert.equal(isOrgWriteAllowed({ orgId: "org_a", isDemo: false, envValue: " , ," }), false);
  });

  test("an org on the list can write; others can't", () => {
    const envValue = "org_a, org_b ";
    assert.equal(isOrgWriteAllowed({ orgId: "org_a", isDemo: false, envValue }), true);
    assert.equal(isOrgWriteAllowed({ orgId: "org_b", isDemo: false, envValue }), true);
    assert.equal(isOrgWriteAllowed({ orgId: "org_c", isDemo: false, envValue }), false);
  });

  test("matches whole ids, not prefixes", () => {
    assert.equal(isOrgWriteAllowed({ orgId: "org_ab", isDemo: false, envValue: "org_a" }), false);
    assert.equal(isOrgWriteAllowed({ orgId: "org_a", isDemo: false, envValue: "org_ab" }), false);
  });
});

describe("parseAllowedOrgIds", () => {
  test("trims ids and drops empty entries", () => {
    assert.deepEqual([...parseAllowedOrgIds(" org_a ,,org_b,")], ["org_a", "org_b"]);
  });
});
