import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { Card } from "./card";
import { Tooltip } from "./tooltip";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  helpText?: string;
  trend?: { direction: "up" | "down"; label: string; positive?: boolean };
  icon?: ReactNode;
  className?: string;
  /** Explains how the value is calculated (inputs + weights) — shown on hover and keyboard focus. */
  tooltip?: string;
  /** Colour-codes the value by health threshold. Omit for a plain numeric/text metric. */
  tone?: "healthy" | "warning" | "critical";
}

const TONE_CLASSES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  healthy: "text-(--color-success)",
  warning: "text-(--color-warning)",
  critical: "text-(--color-critical)",
};

export function MetricCard({ label, value, helpText, trend, icon, className, tooltip, tone }: MetricCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-1 text-small text-(--color-text-muted)">
          {label}
          {tooltip && (
            <Tooltip label={tooltip}>
              <span
                tabIndex={0}
                aria-label={`How ${label} is calculated: ${tooltip}`}
                className="inline-flex cursor-help rounded-full text-(--color-text-muted) hover:text-(--color-text-primary) focus:text-(--color-text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand)"
              >
                <Info size={13} />
              </span>
            </Tooltip>
          )}
        </span>
        {icon && <span className="text-(--color-text-muted)">{icon}</span>}
      </div>
      <div className={cn("mt-2 text-h2", tone ? TONE_CLASSES[tone] : "text-(--color-text-primary)")}>{value}</div>
      {(helpText || trend) && (
        <div className="mt-1.5 flex items-center gap-2 text-small">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                trend.positive === false ? "text-(--color-critical)" : "text-(--color-success)",
              )}
            >
              {trend.direction === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {trend.label}
            </span>
          )}
          {helpText && <span className="text-(--color-text-muted)">{helpText}</span>}
        </div>
      )}
    </Card>
  );
}
