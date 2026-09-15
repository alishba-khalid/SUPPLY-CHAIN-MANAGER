import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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


