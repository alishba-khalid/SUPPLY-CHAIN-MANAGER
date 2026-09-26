/**
 * Turns a critically-low health-score card into an explicit "Needs
 * Attention" entry — the score cards show a number, but a number alone
 * doesn't say why it's low or what to do about it.
 */
import type { SupplyChainAlert, Warehouse } from "@/types/supply-chain";
import { HEALTH_CRITICAL_THRESHOLD } from "@/lib/metrics/health";
import { utilizationBand } from "@/lib/metrics/warehouse";

export interface WarehouseScoreDetail {
  warehouse: Warehouse;
  utilizationPercent: number;
  issueRateScore: number;
  score: number;
}

export interface HealthScoreContext {
  inventory: { score: number; unhealthyCount: number; totalCount: number };
  supplier: { score: number; worst?: { supplierId: string; name: string; otifPercent: number } };
  procurement: { score: number; fulfillment: number; cycleTime: number; priceStability: number };
  logistics: { score: number; onTimeRate: number | null };
  /** score is null when no warehouse has a known capacity; worst only ever names one that does. */
  warehouse: { score: number | null; worst: WarehouseScoreDetail | null };
}

export function buildHealthScoreAlerts(ctx: HealthScoreContext): SupplyChainAlert[] {
  const now = new Date().toISOString();
  const alerts: SupplyChainAlert[] = [];

  if (ctx.inventory.score < HEALTH_CRITICAL_THRESHOLD) {
    alerts.push({
      id: "ALT-HEALTH-INVENTORY",
      category: "inventory",
      severity: "critical",
      title: `Inventory health is critical — ${ctx.inventory.score}/100`,
      description: `${ctx.inventory.unhealthyCount} of ${ctx.inventory.totalCount} SKU x warehouse positions are outside a healthy status (stock-out risk, low stock, overstock, slow-moving, or dead stock).`,
      link: { href: "/dashboard/inventory", label: "Review Inventory" },
      createdAt: now,
    });
  }

  if (ctx.supplier.score < HEALTH_CRITICAL_THRESHOLD) {
    const w = ctx.supplier.worst;
    alerts.push({
      id: "ALT-HEALTH-SUPPLIER",
      category: "supplier",
      severity: "critical",
      title: `Supplier health is critical — ${ctx.supplier.score}/100`,
      description: w
        ? `Spend-weighted on-time-in-full rate is dragged down by ${w.name} (${w.supplierId}) at ${w.otifPercent}% OTIF.`
        : `Spend-weighted on-time-in-full rate across suppliers is well below target.`,
      supplierId: w?.supplierId,
      link: { href: "/dashboard/suppliers", label: "Review Suppliers" },
      createdAt: now,
    });
  }

  if (ctx.procurement.score < HEALTH_CRITICAL_THRESHOLD) {
    const parts: [string, number][] = [
      ["fulfillment (OTIF) rate", ctx.procurement.fulfillment],
      ["on-time cycle rate", ctx.procurement.cycleTime],
      ["price stability", ctx.procurement.priceStability],
    ];
    parts.sort((a, b) => a[1] - b[1]);
    const [worstLabel, worstValue] = parts[0];
    alerts.push({
      id: "ALT-HEALTH-PROCUREMENT",
      category: "procurement",
      severity: "critical",
      title: `Procurement health is critical — ${ctx.procurement.score}/100`,
      description: `Driven mainly by a weak ${worstLabel}, at ${worstValue}/100 over the trailing 90 days.`,
      link: { href: "/dashboard/procurement", label: "Review Procurement" },
      createdAt: now,
    });
  }

  if (ctx.logistics.score < HEALTH_CRITICAL_THRESHOLD) {
    alerts.push({
      id: "ALT-HEALTH-LOGISTICS",
      category: "logistics",
      severity: "critical",
      title: `Logistics health is critical — ${ctx.logistics.score}/100`,
      description: `Inbound purchase-order on-time delivery rate is ${ctx.logistics.onTimeRate !== null ? `${ctx.logistics.onTimeRate}%` : "unavailable"} over the trailing 90 days.`,
      link: { href: "/dashboard/logistics", label: "Review Logistics" },
      createdAt: now,
    });
  }

  if (ctx.warehouse.score !== null && ctx.warehouse.score < HEALTH_CRITICAL_THRESHOLD) {
    const w = ctx.warehouse.worst;
    const isUnderutilized = w ? utilizationBand(w.utilizationPercent) === "underutilized" : false;
    const underutilizationExplainer =
      " Space you lease but don't use is fixed cost with no return — under-utilization below 70% signals either over-leased space or misallocated stock.";
    alerts.push({
      id: "ALT-HEALTH-WAREHOUSE",
      category: "warehouse",
      severity: "critical",
      title: `Warehouse health is critical — ${ctx.warehouse.score}/100`,
      description: w
        ? `${w.warehouse.code} is the weakest position at ${w.score}/100 — ${Math.round(w.utilizationPercent)}% capacity utilization (healthy range is 70-90%) with an inventory issue-rate score of ${w.issueRateScore}/100.${isUnderutilized ? underutilizationExplainer : ""}`
        : `Average capacity utilization and inventory issue-rate across warehouses is well below target.`,
      warehouseId: w?.warehouse.id,
      link: { href: "/dashboard/warehouses", label: "Review Warehouses" },
      createdAt: now,
    });
  }

  return alerts;
}
