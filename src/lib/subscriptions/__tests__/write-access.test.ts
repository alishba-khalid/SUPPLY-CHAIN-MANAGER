import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isOrgAllowListed, parseAllowedOrgIds } from "@/lib/subscriptions/write-access";

// The demo org and subscriptions are covered in billing-access.test.ts.
describe("isOrgAllowListed", () => {
  test("fails closed: a missing or empty list blocks every org", () => {
    assert.equal(isOrgAllowListed("org_a", undefined), false);
    assert.equal(isOrgAllowListed("org_a", ""), false);
    assert.equal(isOrgAllowListed("org_a", " , ,"), false);
  });

  test("an org on the list is allowed; others aren't", () => {
    const envValue = "org_a, org_b ";
    assert.equal(isOrgAllowListed("org_a", envValue), true);
    assert.equal(isOrgAllowListed("org_b", envValue), true);
    assert.equal(isOrgAllowListed("org_c", envValue), false);
  });

  test("matches whole ids, not prefixes", () => {
    assert.equal(isOrgAllowListed("org_ab", "org_a"), false);
    assert.equal(isOrgAllowListed("org_a", "org_ab"), false);
  });
});

describe("parseAllowedOrgIds", () => {
  test("trims ids and drops empty entries", () => {
    assert.deepEqual([...parseAllowedOrgIds(" org_a ,,org_b,")], ["org_a", "org_b"]);
  });
});
