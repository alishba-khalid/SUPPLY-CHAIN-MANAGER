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
  const { orgId } = await auth();
  if (!orgId) {
    const cookieStore = await cookies();
    if (cookieStore.get("demo_mode")?.value === "true") {
      return DEMO_ORG_ID;
    }
    if (process.env.NODE_ENV === "development") {
      return DEMO_ORG_ID;
    }
    redirect("/select-org");
  }
  return orgId;
}


