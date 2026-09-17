import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Info, OctagonAlert, Sparkles, ArrowRight, Zap } from "lucide-react";
import type { SupplyChainAlert } from "@/types/supply-chain";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<SupplyChainAlert["severity"], { icon: typeof Info; className: string; iconClass: string }> = {
  info: { icon: Info, className: "border-(--color-border) bg-(--color-info-bg)", iconClass: "text-(--color-info)" },
  warning: {
    icon: AlertTriangle,
    className: "border-(--color-border) bg-(--color-warning-bg)",
    iconClass: "text-(--color-warning)",
  },
  critical: {
    icon: OctagonAlert,
    className: "border-(--color-border) bg-(--color-critical-bg)",
    iconClass: "text-(--color-critical)",
  },
};

export function AlertCard({
  alert,
  actions,
  isStarter = false,
  onQuickOrder,
}: {
  alert: SupplyChainAlert;
  actions?: ReactNode;
  isStarter?: boolean;
  onQuickOrder?: (alert: SupplyChainAlert) => void;
}) {
  const style = SEVERITY_STYLES[alert.severity];
  const Icon = style.icon;

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border p-4 transition-all", style.className)}>
      <div className="flex gap-3">
        <Icon size={18} className={cn("mt-0.5 shrink-0", style.iconClass)} />
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium text-(--color-text-primary)">{alert.title}</p>
          <p className="mt-0.5 text-small text-(--color-text-secondary)">{alert.description}</p>
        </div>
      </div>

      {/* Principle B1: Visible Teaser on Starter Plan */}
      {isStarter && alert.teaser && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-(--color-surface-secondary) px-3 py-2 text-caption text-(--color-text-muted) border border-(--color-border)">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles size={14} className="text-amber-500 shrink-0" />
            <span className="truncate">{alert.teaser}</span>
          </div>
          <Link
            href="/dashboard/settings?tab=billing"
            className="shrink-0 font-medium text-(--color-brand) hover:underline flex items-center gap-1"
          >
            Upgrade <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Growth+ Action: 1-Click Suggested PO */}
      {!isStarter && Boolean(alert.suggestedQuantity && alert.suggestedQuantity > 0) && onQuickOrder && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-emerald-500/10 px-3 py-2 text-caption text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="font-medium">
            Suggested reorder: {alert.suggestedQuantity?.toLocaleString()} units
            {alert.estimatedCost ? ` (~$${alert.estimatedCost.toLocaleString()})` : ""}
          </span>
          <button
            type="button"
            onClick={() => onQuickOrder(alert)}
            className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-caption font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <Zap size={12} /> 1-Click Order
          </button>
        </div>
      )}

      {/* Overstock Rollup Action: View in Inventory */}
      {alert.id === "ALT-INV-OVERSTOCK-AGGREGATE" && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-amber-500/10 px-3 py-2 text-caption text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <span className="font-medium">Capital optimization opportunity</span>
          <Link
            href="/dashboard/inventory?status=overstock"
            className="flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-caption font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            Triage in Inventory <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {alert.link && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-(--color-surface-secondary) px-3 py-2 text-caption text-(--color-text-muted) border border-(--color-border)">
          <span className="font-medium">Why this is low</span>
          <Link
            href={alert.link.href}
            className="shrink-0 font-medium text-(--color-brand) hover:underline flex items-center gap-1"
          >
            {alert.link.label} <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {actions && <div className="flex items-center gap-2 pt-1">{actions}</div>}
    </div>
  );
}
