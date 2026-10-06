import Link from "next/link";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { clerkClient } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { isDemoOrg, requireOrgId } from "@/lib/auth";
import { describePolarError, getPolarClient, subscriptionStateFromPolar } from "@/lib/polar";
import { PLAN_DEFINITIONS } from "@/lib/subscriptions/tiers";
import { saveSubscriptionState } from "@/data/repositories/org-subscriptions";
import type { PlanTier } from "@/types/subscription";

type SyncResult =
  | { kind: "active"; plan: PlanTier }
  | { kind: "processing" }
  | { kind: "not-paid" }
  | { kind: "problem"; message: string };

/**
 * Re-reads the checkout from Polar instead of waiting for the webhook, so a
 * paid org gets access right away even if the webhook is late. The checkout
 * must belong to the signed-in org; the org is never taken from the URL.
 */
async function syncCheckout(orgId: string, checkoutId: string | undefined): Promise<SyncResult> {
  if (isDemoOrg(orgId)) return { kind: "problem", message: "The live demo can't buy a plan." };
  if (!checkoutId) return { kind: "problem", message: "This page needs a checkout reference from Polar." };

  const client = getPolarClient();
  if (!client.ok) {
    console.error(`[billing] success page: missing env: ${client.missing.join(", ")}`);
    return { kind: "problem", message: "Billing isn't set up on this site yet. Nothing was charged." };
  }

  try {
    const checkout = await client.polar.checkouts.get(checkoutId);
    if (checkout.external_customer_id !== orgId) {
      return { kind: "problem", message: "This checkout belongs to a different organization. Switch to it to see its plan." };
    }
    if (checkout.status === "open") return { kind: "not-paid" };
    if (checkout.status === "expired" || checkout.status === "failed") {
      return { kind: "problem", message: "This checkout didn't complete. Nothing was charged." };
    }
    // confirmed = payment still processing; succeeded without a
    // subscription yet = Polar is still creating it. The webhook will finish.
    if (checkout.status !== "succeeded" || !checkout.subscription_id) return { kind: "processing" };

    const subscription = await client.polar.subscriptions.get(checkout.subscription_id);
    const converted = subscriptionStateFromPolar(subscription, process.env);
    if (!converted.ok || converted.state.orgId !== orgId) {
      console.error(`[billing] success page: subscription ${subscription.id} not stored (${converted.ok ? "org mismatch" : converted.reason})`);
      return { kind: "problem", message: "Payment went through, but the plan couldn't be matched. Contact us and we'll fix it." };
    }
    await saveSubscriptionState(converted.state);
    return { kind: "active", plan: converted.state.plan };
  } catch (err) {
    console.error(`[billing] org ${orgId}: success page sync failed: ${describePolarError(err)}`);
    return { kind: "processing" };
  }
}

async function orgDisplayName(orgId: string): Promise<string | null> {
  if (isDemoOrg(orgId)) return null;
  try {
    const clerk = await clerkClient();
    return (await clerk.organizations.getOrganization({ organizationId: orgId })).name;
  } catch {
    return null;
  }
}

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>;
}) {
  const orgId = await requireOrgId();
  const { checkout_id: checkoutId } = await searchParams;
  const [result, orgName] = await Promise.all([syncCheckout(orgId, checkoutId), orgDisplayName(orgId)]);
  const forOrg = orgName ? ` for ${orgName}` : "";

  return (
    <div>
      <PageHeader title="Billing" description="Your plan and payment status." />
      <div className="p-8">
        <div className="max-w-xl rounded-xl border border-(--color-border) bg-(--color-surface) p-6 space-y-4">
          {result.kind === "active" && (
            <>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
                <h2 className="text-h3 font-semibold">{PLAN_DEFINITIONS[result.plan].name} plan active{forOrg}</h2>
              </div>
              <p className="text-body text-(--color-text-secondary)">
                Payment received. You can now add your own data.
              </p>
              <div className="flex gap-2">
                <Link href="/dashboard/import" className={buttonVariants({ variant: "primary", size: "md" })}>
                  Import your data
                </Link>
                <Link href="/dashboard/settings?tab=billing" className={buttonVariants({ variant: "secondary", size: "md" })}>
                  View billing
                </Link>
              </div>
            </>
          )}
          {result.kind === "processing" && (
            <>
              <div className="flex items-center gap-2 text-(--color-text-primary)">
                <Clock size={20} />
                <h2 className="text-h3 font-semibold">Payment is processing{forOrg}</h2>
              </div>
              <p className="text-body text-(--color-text-secondary)">
                Polar is confirming your payment. This usually takes a few seconds; refresh this page to check again.
              </p>
              <Link href={`/dashboard/billing/success?checkout_id=${encodeURIComponent(checkoutId ?? "")}`} className={buttonVariants({ variant: "secondary", size: "md" })}>
                Refresh
              </Link>
            </>
          )}
          {result.kind === "not-paid" && (
            <>
              <h2 className="text-h3 font-semibold text-(--color-text-primary)">Checkout not finished</h2>
              <p className="text-body text-(--color-text-secondary)">Nothing was charged. You can pick a plan again any time.</p>
              <Link href="/dashboard/settings?tab=billing" className={buttonVariants({ variant: "secondary", size: "md" })}>
                Back to plans
              </Link>
            </>
          )}
          {result.kind === "problem" && (
            <>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle size={20} />
                <h2 className="text-h3 font-semibold">Billing</h2>
              </div>
              <p className="text-body text-(--color-text-secondary)">{result.message}</p>
              <Link href="/dashboard/settings?tab=billing" className={buttonVariants({ variant: "secondary", size: "md" })}>
                Back to plans
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
