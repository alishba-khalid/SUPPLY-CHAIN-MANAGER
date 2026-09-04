"use client";

import { useState, useTransition } from "react";
import { PLAN_DEFINITIONS, TIER_ORDER } from "@/lib/subscriptions/tiers";
import type { OrgSubscription, PlanTier, QuotaUsage, BillingCycle } from "@/types/subscription";
import { changePlanAction } from "@/app/actions/subscription";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Building2, Package, Bot, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function BillingView({
  subscription,
  quota,
}: {
  subscription: OrgSubscription;
  quota: QuotaUsage;
}) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(subscription.billingCycle || "monthly");
  const [isPending, startTransition] = useTransition();
  const [activePlan, setActivePlan] = useState<PlanTier>(subscription.plan);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const currentPlanDef = PLAN_DEFINITIONS[activePlan];

  function handleSelectPlan(plan: PlanTier) {
    if (plan === activePlan) return;

    startTransition(async () => {
      const res = await changePlanAction({ plan, billingCycle });
      if (res.success) {
        setActivePlan(plan);
        setStatusMsg((res as { message?: string }).message || `Successfully switched to the ${PLAN_DEFINITIONS[plan].name} plan!`);
        setTimeout(() => setStatusMsg(null), 4000);
      }
    });
  }

  // Calculate trial days left if in trial
  const trialEnds = new Date(subscription.trialEndsAt);
  const today = new Date();
  const trialDaysLeft = Math.max(0, Math.ceil((trialEnds.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-8">
      {/* Active Trial / Status Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-5 text-small">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-body text-(--color-text-primary)">
                  {currentPlanDef.name} Plan
                </h3>
                {subscription.status === "trialing" && (
                  <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-caption font-semibold text-blue-600 dark:text-blue-400">
                    14-Day Pro Trial
                  </span>
                )}
              </div>
              <p className="text-small text-(--color-text-secondary)">
                {subscription.status === "trialing"
                  ? `${trialDaysLeft} days remaining in your trial with all Professional capabilities unlocked.`
                  : currentPlanDef.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-caption text-(--color-text-muted)">Billing:</span>
            <span className="rounded bg-(--color-surface) px-2.5 py-1 text-caption font-medium border border-(--color-border)">
              {billingCycle === "annual" ? "Annual (2 Months Free)" : "Monthly"}
            </span>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-small text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ {statusMsg}
        </div>
      )}

      {/* Quota & Usage Meter Section */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6 space-y-4">
        <h3 className="font-semibold text-body text-(--color-text-primary)">Network & Resource Usage</h3>
        <p className="text-small text-(--color-text-muted)">
          Supply Chain Manager scales with your supply chain complexity (warehouses and SKU count), not user seats.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Warehouses Meter */}
          <div className="space-y-2 rounded-lg border border-(--color-border) p-4 bg-(--color-surface-secondary)">
            <div className="flex items-center justify-between text-small font-medium text-(--color-text-primary)">
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-(--color-brand)" /> Warehouses
              </span>
              <span>
                {quota.warehouses.used} / {quota.warehouses.limit === -1 ? "Unlimited" : quota.warehouses.limit}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-(--color-border) overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  quota.warehouses.isOverLimit ? "bg-red-500" : "bg-(--color-brand)"
                )}
                style={{
                  width: `${
                    quota.warehouses.limit === -1
                      ? 20
                      : Math.min(100, (quota.warehouses.used / quota.warehouses.limit) * 100)
                  }%`,
                }}
              />
            </div>
            <p className="text-caption text-(--color-text-muted)">
              {quota.warehouses.limit === -1
                ? "Unlimited facilities allowed"
                : `${Math.max(0, quota.warehouses.limit - quota.warehouses.used)} facility slots available`}
            </p>
          </div>

          {/* SKU Catalog Meter */}
          <div className="space-y-2 rounded-lg border border-(--color-border) p-4 bg-(--color-surface-secondary)">
            <div className="flex items-center justify-between text-small font-medium text-(--color-text-primary)">
              <span className="flex items-center gap-2">
                <Package size={16} className="text-blue-500" /> Active SKUs
              </span>
              <span>
                {quota.skus.used.toLocaleString()} /{" "}
                {quota.skus.limit === -1 ? "Unlimited" : quota.skus.limit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-(--color-border) overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  quota.skus.isOverLimit ? "bg-red-500" : "bg-blue-500"
                )}
                style={{
                  width: `${
                    quota.skus.limit === -1 ? 15 : Math.min(100, (quota.skus.used / quota.skus.limit) * 100)
                  }%`,
                }}
              />
            </div>
            <p className="text-caption text-(--color-text-muted)">
              {quota.skus.limit === -1
                ? "Unlimited catalog size"
                : `${Math.max(0, quota.skus.limit - quota.skus.used).toLocaleString()} product slots remaining`}
            </p>
          </div>

          {/* AI Queries Meter */}
          <div className="space-y-2 rounded-lg border border-(--color-border) p-4 bg-(--color-surface-secondary)">
            <div className="flex items-center justify-between text-small font-medium text-(--color-text-primary)">
              <span className="flex items-center gap-2">
                <Bot size={16} className="text-purple-500" /> Monthly AI Queries
              </span>
              <span>
                {quota.aiQueries.used} /{" "}
                {quota.aiQueries.limit === -1 ? "Custom" : quota.aiQueries.limit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-(--color-border) overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  quota.aiQueries.isOverLimit ? "bg-red-500" : "bg-purple-500"
                )}
                style={{
                  width: `${
                    quota.aiQueries.limit === -1
                      ? 25
                      : Math.min(100, (quota.aiQueries.used / quota.aiQueries.limit) * 100)
                  }%`,
                }}
              />
            </div>
            <p className="text-caption text-(--color-text-muted)">
              {quota.aiQueries.remaining.toLocaleString()} natural language queries left this cycle
            </p>
          </div>
        </div>
      </div>

      {/* Monthly / Annual Toggle */}
      <div className="flex flex-col items-center justify-center gap-3 pt-2">
        <div className="inline-flex rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-1">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "rounded-md px-4 py-1.5 text-small font-medium transition-colors",
              billingCycle === "monthly"
                ? "bg-(--color-surface) text-(--color-text-primary) shadow-xs"
                : "text-(--color-text-muted) hover:text-(--color-text-primary)"
            )}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-1.5 text-small font-medium transition-colors",
              billingCycle === "annual"
                ? "bg-(--color-surface) text-(--color-text-primary) shadow-xs"
                : "text-(--color-text-muted) hover:text-(--color-text-primary)"
            )}
          >
            Annual Billing
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-caption font-semibold text-emerald-600 dark:text-emerald-400">
              2 Months Free
            </span>
          </button>
        </div>
      </div>

      {/* 4-Tier Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {TIER_ORDER.map((tierKey) => {
          const plan = PLAN_DEFINITIONS[tierKey];
          const isCurrent = activePlan === tierKey;
          const price = billingCycle === "annual" ? plan.annualMonthlyPrice : plan.monthlyPrice;

          return (
            <div
              key={tierKey}
              className={cn(
                "relative flex flex-col justify-between rounded-xl border p-6 bg-(--color-surface) transition-all",
                isCurrent
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
                      {tierKey === "enterprise" ? "$2,000+" : `$${price}`}
                    </span>
                    <span className="text-small text-(--color-text-muted)">/ month</span>
                  </div>
                  {billingCycle === "annual" && tierKey !== "enterprise" && (
                    <p className="mt-1 text-caption text-emerald-600 dark:text-emerald-400">
                      ${price * 12}/year (billed annually)
                    </p>
                  )}
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
                ) : (
                  <Button
                    onClick={() => handleSelectPlan(tierKey)}
                    disabled={isPending}
                    variant={plan.highlighted ? "primary" : "secondary"}
                    className="w-full gap-1.5"
                  >
                    {isPending ? "Updating..." : `Switch to ${plan.name}`}
                    <ArrowRight size={14} />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
