"use client";

import { useSearchParams } from "next/navigation";
import { PLAN_DEFINITIONS, TIER_ORDER } from "@/lib/subscriptions/tiers";
import { billingErrorMessage, isBillingErrorCode } from "@/lib/subscriptions/billing-messages";
import { CONTACT_EMAIL } from "@/lib/site-config";
import type { OrgSubscription, PlanSource, PlanTier, QuotaUsage } from "@/types/subscription";
import { Button, buttonVariants } from "@/components/ui/button";
import { AlertCircle, Check, Sparkles, Building2, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCE_NOTE: Record<PlanSource, string> = {
  subscription: "Billed monthly through Polar. Change plan, update your card or cancel in Manage billing.",
  "allow-list": "Access granted manually. Choose a plan below to start paying for it.",
  demo: "Live demo. Plans can't be bought here.",
  none: "Choose a plan to add your own data.",
};

export function BillingView({
  subscription,
  quota,
  orgName,
}: {
  subscription: OrgSubscription;
  quota: QuotaUsage;
  /** Shown so nobody pays for the wrong organization; null in the demo. */
  orgName: string | null;
}) {
  // null = "No plan" (never paid and not on the allow-list). Buying happens
  // in /api/billing/checkout, changing or cancelling in /api/billing/portal;
  // both take the org from the session.
  const activePlan: PlanTier | null = subscription.plan;
  const source = subscription.source;
  const currentPlanDef = activePlan === null ? null : PLAN_DEFINITIONS[activePlan];
  const wh = quota.warehouses;
  const skus = quota.skus;

  const searchParams = useSearchParams();
  const errorCode = searchParams.get("billing_error") ?? "";
  const requestedPlan = searchParams.get("plan");
  const errorMessage = isBillingErrorCode(errorCode) ? billingErrorMessage(errorCode, requestedPlan) : null;

  return (
    <div className="space-y-8">
      {/* Plan / Status Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-5 text-small">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-body text-(--color-text-primary)">
                  {currentPlanDef === null ? "No plan" : `${currentPlanDef.name} Plan`}
                </h3>
              </div>
              {orgName && (
                <p className="text-small font-medium text-(--color-text-primary)">Organization: {orgName}</p>
              )}
              <p className="text-small text-(--color-text-secondary)">{SOURCE_NOTE[source]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {source === "subscription" ? (
              <a href="/api/billing/portal" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Manage billing
              </a>
            ) : (
              <>
                <span className="text-caption text-(--color-text-muted)">Billing:</span>
                <span className="rounded bg-(--color-surface) px-2.5 py-1 text-caption font-medium border border-(--color-border)">
                  Monthly
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div role="alert" className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-small text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quota & Usage Meter Section */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6 space-y-4">
        <h3 className="font-semibold text-body text-(--color-text-primary)">Network & Resource Usage</h3>
        <p className="text-small text-(--color-text-muted)">
          How much of your plan&apos;s warehouse and SKU allowance this workspace is using.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Warehouses Meter */}
          <div className="space-y-2 rounded-lg border border-(--color-border) p-4 bg-(--color-surface-secondary)">
            <div className="flex items-center justify-between text-small font-medium text-(--color-text-primary)">
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-(--color-brand)" /> Warehouses
              </span>
              <span>
                {wh.used} / {wh.limit === null ? "—" : wh.limit === -1 ? "Unlimited" : wh.limit}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-(--color-border) overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  wh.isOverLimit ? "bg-red-500" : "bg-(--color-brand)"
                )}
                style={{
                  width: `${
                    wh.limit === null ? 0 : wh.limit === -1 ? 20 : Math.min(100, (wh.used / wh.limit) * 100)
                  }%`,
                }}
              />
            </div>
            <p className="text-caption text-(--color-text-muted)">
              {wh.limit === null
                ? "No plan"
                : wh.limit === -1
                  ? "Unlimited facilities allowed"
                  : `${Math.max(0, wh.limit - wh.used)} facility slots available`}
            </p>
          </div>

          {/* SKU Catalog Meter */}
          <div className="space-y-2 rounded-lg border border-(--color-border) p-4 bg-(--color-surface-secondary)">
            <div className="flex items-center justify-between text-small font-medium text-(--color-text-primary)">
              <span className="flex items-center gap-2">
                <Package size={16} className="text-blue-500" /> Active SKUs
              </span>
              <span>
                {skus.used.toLocaleString()} /{" "}
                {skus.limit === null ? "—" : skus.limit === -1 ? "Unlimited" : skus.limit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-(--color-border) overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  skus.isOverLimit ? "bg-red-500" : "bg-blue-500"
                )}
                style={{
                  width: `${
                    skus.limit === null ? 0 : skus.limit === -1 ? 15 : Math.min(100, (skus.used / skus.limit) * 100)
                  }%`,
                }}
              />
            </div>
            <p className="text-caption text-(--color-text-muted)">
              {skus.limit === null
                ? "No plan"
                : skus.limit === -1
                  ? "Unlimited catalog size"
                  : `${Math.max(0, skus.limit - skus.used).toLocaleString()} product slots remaining`}
            </p>
          </div>
        </div>
      </div>

      {/* 4-Tier Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {TIER_ORDER.map((tierKey) => {
          const plan = PLAN_DEFINITIONS[tierKey];
          // "Current" only for a plan being paid for (or the demo's); an
          // allow-listed org's Growth is an override it can still buy.
          const isCurrent = activePlan === tierKey && (source === "subscription" || source === "demo");
          const isRequested = requestedPlan === tierKey && !isCurrent;
          const price = plan.monthlyPrice;

          return (
            <div
              key={tierKey}
              className={cn(
                "relative flex flex-col justify-between rounded-xl border p-6 bg-(--color-surface) transition-all",
                isCurrent || isRequested
                  ? "border-(--color-brand) ring-2 ring-(--color-brand)/20 shadow-md"
                  : "border-(--color-border) hover:border-(--color-border-hover)"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-(--color-brand) px-3 py-0.5 text-caption font-semibold text-white shadow-xs">
                  Most Popular
                </span>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-lg text-(--color-text-primary)">{plan.name}</h4>
                  {isCurrent && (
                    <span className="rounded bg-(--color-brand)/10 px-2 py-0.5 text-caption font-semibold text-(--color-brand)">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-small text-(--color-text-secondary) min-h-[36px]">{plan.tagline}</p>

                <div className="mt-4 pb-4 border-b border-(--color-border)">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-(--color-text-primary)">
                      {plan.contactUsInstead ? `$${plan.monthlyPrice.toLocaleString("en-US")}+` : `$${price}`}
                    </span>
                    <span className="text-small text-(--color-text-muted)">/ month</span>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  <p className="text-caption font-semibold uppercase tracking-wider text-(--color-text-muted)">
                    What&apos;s Included:
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-small text-(--color-text-secondary)">
                        <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-(--color-border)">
                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : source === "demo" ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Not available in the demo
                  </Button>
                ) : plan.contactUsInstead ? (
                  <a href={`mailto:${CONTACT_EMAIL}`} className={buttonVariants({ variant: "secondary", className: "w-full" })}>
                    Contact us
                  </a>
                ) : source === "subscription" ? (
                  <a href="/api/billing/portal" className={buttonVariants({ variant: "secondary", className: "w-full" })}>
                    Change plan
                  </a>
                ) : (
                  <a
                    href={`/api/billing/checkout?plan=${tierKey}`}
                    className={buttonVariants({
                      variant: plan.highlighted || isRequested ? "primary" : "secondary",
                      className: "w-full",
                    })}
                  >
                    Choose {plan.name}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
