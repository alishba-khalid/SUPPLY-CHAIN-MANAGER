import { NextResponse, type NextRequest } from "next/server";
import { getOrgAccess, isDemoOrg, requireOrgId } from "@/lib/auth";
import { describePolarError, getPolarClient, productIdForPlan } from "@/lib/polar";
import { isPlanTier } from "@/lib/subscriptions/write-access";
import type { BillingErrorCode } from "@/lib/subscriptions/billing-messages";

/**
 * GET /api/billing/checkout?plan=growth — starts a Polar checkout for the
 * signed-in org. The org comes from the session only (requireOrgId), never
 * from the URL; ?plan= only picks which of our products to sell. Every
 * refusal goes back to the Billing tab with a fixed error code.
 */
export async function GET(request: NextRequest) {
  const orgId = await requireOrgId();
  const origin = request.nextUrl.origin;
  const plan = request.nextUrl.searchParams.get("plan") ?? "";

  const backToBilling = (code: BillingErrorCode) => {
    const url = new URL("/dashboard/settings", origin);
    url.searchParams.set("tab", "billing");
    url.searchParams.set("billing_error", code);
    if (isPlanTier(plan)) url.searchParams.set("plan", plan);
    return NextResponse.redirect(url, 303);
  };

  if (isDemoOrg(orgId)) return backToBilling("demo");
  if (!isPlanTier(plan)) return backToBilling("invalid-plan");

  const product = productIdForPlan(plan, process.env);
  if (!product.ok) return backToBilling(product.refusal);

  // An org that already pays changes plan or cancels in Polar's portal, not
  // with a second subscription.
  const access = await getOrgAccess(orgId);
  if (access.source === "subscription") {
    return NextResponse.redirect(new URL("/api/billing/portal", origin), 303);
  }

  const client = getPolarClient();
  if (!client.ok) {
    console.error(`[billing] checkout unavailable, missing env: ${client.missing.join(", ")}`);
    return backToBilling("not-configured");
  }

  try {
    const checkout = await client.polar.checkouts.create({
      products: [product.productId],
      external_customer_id: orgId,
      metadata: { org_id: orgId, plan },
      // Polar fills in {CHECKOUT_ID}; it must stay unencoded.
      success_url: `${origin}/dashboard/billing/success?checkout_id={CHECKOUT_ID}`,
      return_url: `${origin}/dashboard/settings?tab=billing`,
    });
    return NextResponse.redirect(checkout.url, 303);
  } catch (err) {
    console.error(`[billing] org ${orgId}: Polar checkout failed: ${describePolarError(err)}`);
    return backToBilling("polar-error");
  }
}
