/**
 * Who may add or change their own data. There is no billing yet, so a paid
 * plan can't be bought: until it can, only the public demo org (whose writes
 * are simulated or rolled back) and the orgs listed in the
 * IMPORT_ALLOWED_ORG_IDS env var (comma-separated Clerk org ids) can write.
 * Fails closed — a missing or empty list blocks every non-demo org. Reading
 * data is never gated.
 *
 * Pure (takes the demo check and env value as arguments) so it can be tested
 * without a Clerk session; server actions call canWriteOrgData in
 * src/lib/auth.ts.
 */

export const WRITE_BLOCKED_MESSAGE = "Adding your own data needs a paid plan. Billing is coming soon.";
export const BILLING_COMING_SOON_MESSAGE = "Billing is coming soon. Plans can't be purchased or changed yet.";

export function parseAllowedOrgIds(envValue: string | undefined): Set<string> {
  return new Set(
    (envValue ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  );
}

export function isOrgWriteAllowed(opts: { orgId: string; isDemo: boolean; envValue: string | undefined }): boolean {
  if (opts.isDemo) return true;
  return parseAllowedOrgIds(opts.envValue).has(opts.orgId);
}
