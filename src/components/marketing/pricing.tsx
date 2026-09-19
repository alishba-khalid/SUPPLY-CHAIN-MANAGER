"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShieldCheck, Download, Zap, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRICING_TIERS, CONTACT_EMAIL, TRIAL_DAYS, type BillingPeriod } from "@/lib/site-config";

export function Pricing() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">What it costs to keep on payroll</h2>
        <p className="mt-3 text-body-lg text-(--color-text-secondary)">
          Every plan starts with a {TRIAL_DAYS}-day free trial with full Professional capabilities. No credit card required.
        </p>
      </div>

      {/* Monthly / Annual Toggle */}
      <div className="mt-8 flex justify-center">
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-1"
        >
          <button
            type="button"
            onClick={() => setPeriod("monthly")}
            aria-pressed={period === "monthly"}
            className={cn(
              "rounded-md px-4 py-1.5 text-small font-medium transition-colors",
              period === "monthly"
                ? "bg-(--color-surface) text-(--color-text-primary) shadow-sm"
                : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod("annual")}
            aria-pressed={period === "annual"}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-1.5 text-small font-medium transition-colors",
              period === "annual"
                ? "bg-(--color-surface) text-(--color-text-primary) shadow-sm"
                : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
            )}
          >
            Annual
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-caption font-semibold text-emerald-600 dark:text-emerald-400">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* 4-Tier Pricing Grid */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PRICING_TIERS.map((tier) => {
          let price = tier.monthlyPrice;
          if (period === "annual" && !tier.contactUsInstead) {
            if (tier.id === "starter") price = 39;
            else if (tier.id === "growth") price = 159;
            else if (tier.id === "professional") price = 519;
            else price = Math.round(tier.monthlyPrice * 0.8);
          }

          return (
            <Card
              key={tier.id}
              className={cn(
                "relative flex flex-col justify-between p-6 transition-all",
                tier.highlighted
                  ? "border-(--color-brand) ring-2 ring-(--color-brand)/20 shadow-md"
                  : "border-(--color-border) hover:border-(--color-border-hover)"
              )}
            >
              {tier.highlighted && (
                <Badge tone="brand" className="absolute -top-3 left-6">
                  Most popular
                </Badge>
              )}

              <div>
                <h3 className="text-h3 font-bold text-(--color-text-primary)">{tier.name}</h3>
                <p className="mt-1 text-small text-(--color-text-secondary) min-h-[38px]">{tier.audience}</p>

                <div className="mt-4 pb-4 border-b border-(--color-border)">
                  {tier.contactUsInstead ? (
                    <div>
                      <span className="text-h1 font-extrabold text-(--color-text-primary)">From $2,000</span>
                      <span className="text-body text-(--color-text-secondary)"> / mo</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-(--color-text-primary)">${price}</span>
                        <span className="text-body text-(--color-text-secondary)"> / month</span>
                      </div>
                      {period === "annual" && (
                        <p className="mt-1 text-caption font-semibold text-emerald-600 dark:text-emerald-400">
                          ${price * 12}/yr (2 months free)
                        </p>
                      )}
                    </>
                  )}
                </div>

                <ul className="mt-5 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-small font-medium text-(--color-text-primary)">
                      <Check size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-(--color-border)">
                {tier.contactUsInstead ? (
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}
                  >
                    Contact sales
                  </a>
                ) : (
                  <Link
                    href="/sign-up"
                    className={buttonVariants({
                      variant: tier.highlighted ? "primary" : "secondary",
                      size: "lg",
                      className: "w-full",
                    })}
                  >
                    Start 14-day trial
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Friction Removers Bar */}
      <div className="mt-12 rounded-xl border border-(--color-border) bg-(--color-surface-secondary) p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="flex items-center justify-center gap-2 text-small font-semibold text-(--color-text-primary)">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span>14-Day Free Trial</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-small font-semibold text-(--color-text-primary)">
            <XCircle size={18} className="text-(--color-brand)" />
            <span>Cancel Anytime</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-small font-semibold text-(--color-text-primary)">
            <Download size={18} className="text-blue-500" />
            <span>Full Data Export</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-small font-semibold text-(--color-text-primary)">
            <Zap size={18} className="text-purple-500" />
            <span>No Setup Fees</span>
          </div>
        </div>
      </div>
    </section>
  );
}
