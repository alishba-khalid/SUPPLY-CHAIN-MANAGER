import { ArrowDownToLine, ArrowUpFromLine, PackageCheck } from "lucide-react";
import type { ActivityEvent, ActivityEventType } from "@/types/supply-chain";
import { daysBetween, todayISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<ActivityEventType, { iconClass: string }> = {
  po_received: { iconClass: "text-(--color-brand)" },
  inventory_movement: { iconClass: "text-(--color-info)" },
};

function relativeLabel(date: string): string {
  const days = daysBetween(date, todayISODate());
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function ActivityItem({ event }: { event: ActivityEvent }) {
  const Icon = event.type === "po_received" ? PackageCheck : event.title.startsWith("Inbound") ? ArrowDownToLine : ArrowUpFromLine;
  const { iconClass } = TYPE_STYLES[event.type];

  return (
    <div className="flex items-start gap-3 border-b border-(--color-border) py-3 last:border-b-0">
      <Icon size={16} className={cn("mt-0.5 shrink-0", iconClass)} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-(--color-text-primary)">{event.title}</p>
        <p className="mt-0.5 text-small text-(--color-text-secondary)">{event.description}</p>
      </div>
      <span className="shrink-0 text-small whitespace-nowrap text-(--color-text-muted)">{relativeLabel(event.date)}</span>
    </div>
  );
}
