import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-(--color-surface-secondary) text-(--color-text-secondary)",
        brand: "bg-(--color-brand-subtle) text-(--color-brand-hover)",
        success: "bg-(--color-success-bg) text-(--color-success)",
        warning: "bg-(--color-warning-bg) text-(--color-warning)",
        critical: "bg-(--color-critical-bg) text-(--color-critical)",
        info: "bg-(--color-info-bg) text-(--color-info)",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
