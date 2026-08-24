import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  helpText?: string;
  trend?: { direction: "up" | "down"; label: string; positive?: boolean };
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({ label, value, helpText, trend, icon, className }: MetricCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <span className="text-small text-(--color-text-muted)">{label}</span>
        {icon && <span className="text-(--color-text-muted)">{icon}</span>}
      </div>
      <div className="mt-2 text-h2 text-(--color-text-primary)">{value}</div>
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
