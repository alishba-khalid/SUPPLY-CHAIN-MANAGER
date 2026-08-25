import { AlertTriangle, ClipboardEdit, PackageCheck, ShoppingBag } from "lucide-react";
import type { ActivityEvent, ActivityEventType } from "@/types/supply-chain";
import { daysBetween, REFERENCE_DATE } from "@/data/mock/dates";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<ActivityEventType, { icon: typeof PackageCheck; iconClass: string }> = {
  po_received: { icon: PackageCheck, iconClass: "text-(--color-brand)" },
  shipment_delayed: { icon: AlertTriangle, iconClass: "text-(--color-critical)" },
  customer_order_fulfilled: { icon: ShoppingBag, iconClass: "text-(--color-info)" },
  inventory_adjustment: { icon: ClipboardEdit, iconClass: "text-(--color-text-muted)" },
};

function relativeLabel(date: string): string {
  const days = daysBetween(date, REFERENCE_DATE);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function ActivityItem({ event }: { event: ActivityEvent }) {
  const { icon: Icon, iconClass } = TYPE_STYLES[event.type];

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
