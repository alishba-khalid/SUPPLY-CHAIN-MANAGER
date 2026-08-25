"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRICING_TIERS, ANNUAL_DISCOUNT_PERCENT, CONTACT_EMAIL, TRIAL_DAYS, type BillingPeriod } from "@/lib/site-config";

function monthlyEquivalent(monthlyPrice: number, period: BillingPeriod): number {
  if (period === "monthly") return monthlyPrice;
  return Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT_PERCENT / 100));
}

export function Pricing() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">What it costs to keep on payroll</h2>
        <p className="mt-3 text-body-lg text-(--color-text-secondary)">
          Every plan starts with a {TRIAL_DAYS}-day free trial. No credit card required.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex rounded-md border border-(--color-border) bg-(--color-surface-secondary) p-1"
        >
          {(["monthly", "annual"] as BillingPeriod[]).map((option) => (
            <button
              key={option}
              onClick={() => setPeriod(option)}
              aria-pressed={period === option}
              className={cn(
                "rounded-md px-4 py-1.5 text-small font-medium transition-colors",
                period === option
                  ? "bg-(--color-surface) text-(--color-text-primary) shadow-sm"
                  : "text-(--color-text-secondary)",
              )}
            >
              {option === "monthly" ? "Monthly" : `Annual (save ${ANNUAL_DISCOUNT_PERCENT}%)`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <Card
            key={tier.id}
            className={cn("relative flex flex-col p-6", tier.highlighted && "border-(--color-brand) shadow-md")}
          >
            {tier.highlighted && (
              <Badge tone="brand" className="absolute -top-3 left-6">
                Most popular
              </Badge>
            )}

            <h3 className="text-h3 text-(--color-text-primary)">{tier.name}</h3>
            <p className="mt-1 text-small text-(--color-text-secondary)">{tier.audience}</p>

            <div className="mt-5">
              {tier.contactUsInstead ? (
                <span className="text-h1 text-(--color-text-primary)">Contact us</span>
              ) : (
                <>
                  <span className="text-h1 text-(--color-text-primary)">${monthlyEquivalent(tier.monthlyPrice, period)}</span>
                  <span className="text-body text-(--color-text-muted)"> / month</span>
                  {period === "annual" && (
                    <p className="mt-1 text-small text-(--color-text-muted)">billed annually</p>
                  )}
                </>
              )}
            </div>

            <ul className="mt-6 flex-1 space-y-2.5">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-small text-(--color-text-secondary)">
                  <Check size={16} className="mt-0.5 shrink-0 text-(--color-brand)" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {tier.contactUsInstead ? (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}
                >
                  Contact us
                </a>
              ) : (
                <Link
                  href="/dashboard/overview"
                  className={buttonVariants({
                    variant: tier.highlighted ? "primary" : "secondary",
                    size: "lg",
                    className: "w-full",
                  })}
                >
                  Start free trial
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
