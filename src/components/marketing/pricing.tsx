import Link from "next/link";
import { Check, ShieldCheck, Download, Zap, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, PRICING_TIERS } from "@/lib/site-config";

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">What it costs to keep on payroll</h2>
        <p className="mt-3 text-body-lg text-(--color-text-secondary)">
          Try everything in the live demo first, free. Paid plans unlock adding your own data. Billed monthly in US
          dollars, cancel anytime. Sales tax or VAT is added at checkout where your country requires it.
        </p>
      </div>

      {/* 4-Tier Pricing Grid */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PRICING_TIERS.map((tier) => {
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
                      <span className="text-h1 font-extrabold text-(--color-text-primary)">
                        From ${tier.monthlyPrice.toLocaleString("en-US")}
                      </span>
                      <span className="text-body text-(--color-text-secondary)"> USD / mo</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-(--color-text-primary)">${tier.monthlyPrice}</span>
                        <span className="text-body text-(--color-text-secondary)"> USD / month</span>
                      </div>
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
                    Contact us
                  </a>
                ) : (
                  // After sign-up, land on Billing with this plan picked. A new
                  // user who must first create an organization lands on the
                  // overview instead (select-org has its own destination).
                  <Link
                    href={`/sign-up?redirect_url=${encodeURIComponent(`/dashboard/settings?tab=billing&plan=${tier.id}`)}`}
                    className={buttonVariants({
                      variant: tier.highlighted ? "primary" : "secondary",
                      size: "lg",
                      className: "w-full",
                    })}
                  >
                    Get started
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
            <span>Free live demo</span>
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
