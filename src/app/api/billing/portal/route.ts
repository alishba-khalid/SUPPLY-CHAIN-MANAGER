import { NextResponse, type NextRequest } from "next/server";
import { isDemoOrg, requireOrgId } from "@/lib/auth";
import { describePolarError, getPolarClient } from "@/lib/polar";
import type { BillingErrorCode } from "@/lib/subscriptions/billing-messages";

/**
 * GET /api/billing/portal — opens Polar's customer portal (change plan,
 * update card, cancel, invoices) for the signed-in org. The org comes from
 * the session only and is Polar's external customer id.
 */
export async function GET(request: NextRequest) {
  const orgId = await requireOrgId();
  const origin = request.nextUrl.origin;

  const backToBilling = (code: BillingErrorCode) => {
    const url = new URL("/dashboard/settings", origin);
    url.searchParams.set("tab", "billing");
    url.searchParams.set("billing_error", code);
    return NextResponse.redirect(url, 303);
  };

  if (isDemoOrg(orgId)) return backToBilling("demo");

  const client = getPolarClient();
  if (!client.ok) {
    console.error(`[billing] portal unavailable, missing env: ${client.missing.join(", ")}`);
    return backToBilling("not-configured");
  }

  try {
    const session = await client.polar.customerSessions.create({
      external_customer_id: orgId,
      return_url: `${origin}/dashboard/settings?tab=billing`,
    });
    return NextResponse.redirect(session.customer_portal_url, 303);
  } catch (err) {
    // 404 / 422: Polar has no customer with this org as its external id —
    // the org has never completed a checkout.
    const status = (err as { statusCode?: unknown }).statusCode;
    if (status === 404 || status === 422) return backToBilling("no-billing-account");
    console.error(`[billing] org ${orgId}: Polar portal session failed: ${describePolarError(err)}`);
    return backToBilling("polar-error");
  }
}
