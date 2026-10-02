import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { resolveOrgAccess, type OrgAccess } from "@/lib/subscriptions/write-access";
import { listOrgSubscriptions } from "@/data/repositories/org-subscriptions";

/**
 * The *only* sanctioned source of `orgId` anywhere in this app. It reads
 * the signed Clerk session cookie on the server — or the signed demo cookie for public
 * instant exploration — never a URL parameter or raw request body.
 */
export const DEMO_ORG_ID = "org_demo";

export function isDemoOrg(orgId?: string | null): boolean {
  return orgId === DEMO_ORG_ID;
}

export async function requireOrgId(): Promise<string> {
  // Local dev always resolves to the seeded demo org. There are no real
  // tenants yet, and a Clerk session can carry a real (but unseeded) active
  // org — e.g. a stray "My Organization" created while testing sign-up —
  // which would otherwise silently win over the demo fallback below and
  // render an empty dashboard. Production is unaffected: real orgId wins.
  if (process.env.NODE_ENV === "development") {
    return DEMO_ORG_ID;
  }

  const { orgId } = await auth();
  if (!orgId) {
    const cookieStore = await cookies();
    if (cookieStore.get("demo_mode")?.value === "true") {
      return DEMO_ORG_ID;
    }
    redirect("/select-org");
  }
  return orgId;
}



/**
 * This org's plan and whether it may add or change its own data (see
 * src/lib/subscriptions/write-access.ts). Deduplicated per request.
 *
 * If the subscription lookup fails (e.g. org_subscriptions doesn't exist yet
 * because the migration hasn't been applied to this database), it's logged
 * and the org is judged without subscriptions — the demo org and the
 * IMPORT_ALLOWED_ORG_IDS override keep working instead of every write failing.
 */
export const getOrgAccess = cache(async (orgId: string): Promise<OrgAccess> => {
  const isDemo = isDemoOrg(orgId);
  let subscriptions: Awaited<ReturnType<typeof listOrgSubscriptions>> = [];
  if (!isDemo) {
    try {
      subscriptions = await listOrgSubscriptions(orgId);
    } catch (err) {
      console.error(`[billing] org ${orgId}: could not read subscriptions`, err);
    }
  }
  return resolveOrgAccess({
    orgId,
    isDemo,
    allowListEnv: process.env.IMPORT_ALLOWED_ORG_IDS,
    subscriptions,
    now: new Date(),
  });
});

/**
 * Every server action that writes org data awaits this right after
 * requireOrgId() and returns WRITE_BLOCKED_MESSAGE when it's false.
 */
export async function checkOrgWriteAccess(orgId: string): Promise<boolean> {
  return (await getOrgAccess(orgId)).canWrite;
}
