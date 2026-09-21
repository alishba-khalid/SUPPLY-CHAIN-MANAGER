import { Zap } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site-config";

const DISPLAY_HOST = SITE_URL.replace(/^https?:\/\//, "");

/**
 * A static, illustrative snapshot of the dashboard's Overview page — not
 * live data. Mirrors the real Recommended Actions flow: the "Create PO"
 * action shown here is the actual 1-Click Suggested Purchase Order feature
 * (see suggested-po-modal.tsx / createPoFromSuggestionAction), the one
 * recommendation category with a genuine one-click action today. The
 * buttons are inert (span, not button) since this card is a picture of the
 * product, not the product itself.
 */
export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg">
      <div className="flex items-center gap-2 border-b border-(--color-border) bg-(--color-surface-secondary) px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-(--color-critical)" />
        <span className="h-2.5 w-2.5 rounded-full bg-(--color-warning)" />
        <span className="h-2.5 w-2.5 rounded-full bg-(--color-success)" />
        <span className="ml-3 truncate rounded-md bg-(--color-surface) px-3 py-0.5 text-caption font-mono text-(--color-text-secondary)">
          {DISPLAY_HOST}/dashboard/overview
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Supply Chain Health" value="54 / 100" />
          <MetricCard label="Inventory" value="6" />
          <MetricCard label="Suppliers" value="73" />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-caption font-bold uppercase tracking-wider text-(--color-text-secondary)">
              Recommended Actions
            </p>
            <Badge tone="critical">1 critical</Badge>
          </div>

          <div className="rounded-lg border border-(--color-brand)/30 bg-(--color-surface) p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Badge tone="critical">Critical</Badge>
              <span className="text-caption font-mono text-(--color-text-muted)">SKU-1015 · NDC</span>
            </div>

            <dl className="mt-3 space-y-2.5">
              <div>
                <dt className="text-caption font-bold uppercase tracking-wide text-(--color-critical)">Problem</dt>
                <dd className="mt-0.5 text-body font-medium text-(--color-text-primary)">
                  3 days of cover left — below reorder point.
                </dd>
              </div>
              <div>
                <dt className="text-caption font-bold uppercase tracking-wide text-(--color-text-muted)">Why</dt>
                <dd className="mt-0.5 text-small text-(--color-text-secondary)">
                  Selling ~10 units/day, and supplier Orion Electronics&apos; (SUP-004) lead time is 12
                  days — longer than the stock you have left.
                </dd>
              </div>
              <div>
                <dt className="text-caption font-bold uppercase tracking-wide text-(--color-brand)">
                  Recommendation
                </dt>
                <dd className="mt-0.5 text-small text-(--color-text-secondary)">
                  Order 150 units from SUP-004 today (~$1,230).
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex items-center gap-2">
              <span className={buttonVariants({ variant: "primary", size: "sm" })}>
                <Zap size={12} /> Create PO
              </span>
              <span className={buttonVariants({ variant: "ghost", size: "sm" })}>Details</span>
            </div>
          </div>

          <p className="mt-2 text-caption text-(--color-text-muted)">+2 more recommendations waiting on you</p>
        </div>
      </div>
    </div>
  );
}
