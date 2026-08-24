import { Badge, type BadgeProps } from "./badge";

type Tone = NonNullable<BadgeProps["tone"]>;

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  // Inventory status
  healthy: { label: "Healthy", tone: "success" },
  low_stock: { label: "Low Stock", tone: "warning" },
  stock_out_risk: { label: "Critical", tone: "critical" },
  overstock: { label: "Overstock", tone: "info" },
  slow_moving: { label: "Slow Moving", tone: "warning" },
  dead_stock: { label: "Dead Stock", tone: "neutral" },

  // Purchase order status
  draft: { label: "Draft", tone: "neutral" },
  pending_approval: { label: "Pending Approval", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  sent: { label: "Sent", tone: "info" },
  partially_received: { label: "Partially Received", tone: "warning" },
  received: { label: "Received", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },

  // Shipment status
  pending: { label: "Pending", tone: "neutral" },
  in_transit: { label: "In Transit", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  delayed: { label: "Delayed", tone: "critical" },

  // Customer order status
  open: { label: "Open", tone: "info" },
  fulfilled: { label: "Fulfilled", tone: "success" },

  // Alert severity
  info: { label: "Info", tone: "info" },
  warning: { label: "Warning", tone: "warning" },
  critical: { label: "Critical", tone: "critical" },

  // Recommendation priority
  low: { label: "Low", tone: "neutral" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warning" },

  // Warehouse utilization band
  underutilized: { label: "Underutilized", tone: "info" },
  risk: { label: "At Risk", tone: "critical" },

  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "neutral" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const entry = STATUS_MAP[status] ?? { label: label ?? status, tone: "neutral" as Tone };
  return <Badge tone={entry.tone}>{label ?? entry.label}</Badge>;
}
