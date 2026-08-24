import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-(--color-border) px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-surface-secondary) text-(--color-text-muted)">
        {icon ?? <Inbox size={18} />}
      </div>
      <div>
        <p className="text-body font-medium text-(--color-text-primary)">{title}</p>
        {description && <p className="mt-1 text-small text-(--color-text-muted)">{description}</p>}
      </div>
      {action}
    </div>
  );
}
