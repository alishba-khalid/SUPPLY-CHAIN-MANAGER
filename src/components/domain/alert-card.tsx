import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
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

export function AlertCard({ alert }: { alert: SupplyChainAlert }) {
  const style = SEVERITY_STYLES[alert.severity];
  const Icon = style.icon;

  return (
    <div className={cn("flex gap-3 rounded-lg border p-4", style.className)}>
      <Icon size={18} className={cn("mt-0.5 shrink-0", style.iconClass)} />
      <div>
        <p className="text-body font-medium text-(--color-text-primary)">{alert.title}</p>
        <p className="mt-0.5 text-small text-(--color-text-secondary)">{alert.description}</p>
      </div>
    </div>
  );
}
