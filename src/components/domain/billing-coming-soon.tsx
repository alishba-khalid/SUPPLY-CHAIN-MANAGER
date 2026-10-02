"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRICING_TIERS } from "@/lib/site-config";
import { getWriteAccessAction } from "@/app/actions/smart-import";

// One page can mount several gated forms at once (Inventory has four);
// they share a single in-flight check instead of each calling the server.
// Not cached past that, so switching org never shows a stale answer.
let inflight: Promise<{ allowed: boolean }> | null = null;
function checkWriteAccess() {
  inflight ??= getWriteAccessAction().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * Whether this org may add or change its own data — null while the check is
 * in flight. UI only: every write action re-checks on the server
 * (canWriteOrgData in src/lib/auth.ts), so this just decides whether to show
 * a form or the pricing screen.
 */
export function useWriteAccess(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    checkWriteAccess()
      .then((res) => {
        if (!cancelled) setAllowed(res.allowed);
      })
      // If the check itself fails, show the form: the server still refuses
      // the write, and its message explains why.
      .catch(() => {
        if (!cancelled) setAllowed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return allowed;
}

/**
 * Shown in place of an upload or data-entry form for orgs that may not add
 * data. Plans and prices come from PRICING_TIERS (the same source as the
 * marketing pricing section); every button is disabled because no billing
 * exists yet — no checkout, no form, no email.
 */
export function BillingComingSoon({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--color-brand-subtle) text-(--color-brand)">
          <Lock size={18} />
        </div>
        <div>
          <h3 className="text-h3 font-semibold text-(--color-text-primary)">Choose a plan to add your data</h3>
          <p className="mt-1 text-small text-(--color-text-secondary)">
            Your account is ready and you can explore everything. Adding your own data needs a paid plan. Billing is
            coming soon, so plans can&apos;t be bought yet.
          </p>
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-4", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4")}>
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              "relative flex flex-col justify-between rounded-lg border bg-(--color-surface) p-4",
              tier.highlighted ? "border-(--color-brand) ring-2 ring-(--color-brand)/20" : "border-(--color-border)",
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-body font-bold text-(--color-text-primary)">{tier.name}</h4>
                {tier.highlighted && <Badge tone="brand">Most popular</Badge>}
              </div>
              <p className="mt-1 text-caption text-(--color-text-muted)">{tier.audience}</p>
              <p className="mt-3">
                <span className="text-h2 font-extrabold text-(--color-text-primary)">
                  {tier.contactUsInstead ? `From $${tier.monthlyPrice.toLocaleString("en-US")}` : `$${tier.monthlyPrice}`}
                </span>
                <span className="text-small text-(--color-text-secondary)"> / month</span>
              </p>
              {!compact && (
                <ul className="mt-3 space-y-1.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5 text-caption text-(--color-text-primary)">
                      <Check size={14} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              variant={tier.highlighted ? "primary" : "secondary"}
              size="sm"
              className="mt-4 w-full"
              disabled
            >
              Billing coming soon
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders children (a data-entry form or importer) for orgs that may write,
 * and the pricing screen for orgs that may not. Shows children while the
 * check is in flight; the server refuses the write either way.
 */
export function WriteGate({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const canWrite = useWriteAccess();
  return canWrite === false ? <BillingComingSoon compact={compact} /> : <>{children}</>;
}
