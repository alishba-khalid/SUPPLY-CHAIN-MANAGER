/**
 * Derives SupplyChainAlert records from the same underlying data every
 * other module reads — there is no separate "alerts" dataset, so an alert
 * here always matches what the rest of the dashboard shows.
 */
import type {
  InventoryInsight,
  Product,
  PurchaseOrder,
  Supplier,
  SupplierPerformance,
  SupplyChainAlert,
  Warehouse,
} from "@/types/supply-chain";
import { getInventoryInsights } from "@/data/repositories/inventory";
import { getAllSupplierPerformance, getSuppliers } from "@/data/repositories/suppliers";
import { getOpenPurchaseOrders } from "@/data/repositories/procurement";
import { getProducts } from "@/data/repositories/products";
import { getWarehouses } from "@/data/repositories/warehouses";
import { daysBetween, todayISODate } from "@/lib/dates";
import { splitEffectivePipeline } from "@/lib/insights/inventory-availability";

interface AlertWithRank extends SupplyChainAlert {
  tier: number;
  valueAtRisk: number;
}

export interface PreloadedAlertDependencies {
  insights?: InventoryInsight[];
  supplierPerf?: SupplierPerformance[];
  openPOs?: PurchaseOrder[];
  products?: Product[];
  suppliers?: Supplier[];
  warehouses?: Warehouse[];
}

export async function getAlerts(
  orgId: string,
  preloaded?: PreloadedAlertDependencies,
): Promise<SupplyChainAlert[]> {
  const now = new Date().toISOString();
  const today = todayISODate();

  const [insights, supplierPerf, openPOs, products, suppliers, warehouses] = await Promise.all([
    preloaded?.insights ?? getInventoryInsights(orgId),
    preloaded?.supplierPerf ?? getAllSupplierPerformance(orgId),
    preloaded?.openPOs ?? getOpenPurchaseOrders(orgId),
    preloaded?.products ?? getProducts(orgId),
    preloaded?.suppliers ?? getSuppliers(orgId),
    preloaded?.warehouses ?? getWarehouses(orgId),
  ]);

  const productMap = new Map(products.map((p) => [p.sku, p]));
  const supplierMap = new Map(suppliers.map((s) => [s.supplierId, s]));
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

  // Index open POs by SKU
  const openPOsBySku = new Map<string, typeof openPOs>();
  for (const po of openPOs) {
    const list = openPOsBySku.get(po.sku) ?? [];
    list.push(po);
    openPOsBySku.set(po.sku, list);
  }

  const rankedAlerts: AlertWithRank[] = [];
  const overstockedPositions: {
    sku: string;
    warehouseId: number;
    excessUnits: number;
    tiedUpDollars: number;
  }[] = [];

  // 1. Inventory Alerts (Stockout Imminent, Low Stock, Overstock Collection)
  for (const insight of insights) {
    const product = productMap.get(insight.sku);
    const unitCost = product ? Number(product.unitCost) : 0;
    const warehouse = warehouseMap.get(insight.warehouseId);
    const warehouseCode = warehouse?.code ?? `WH-${insight.warehouseId}`;
    const supplier = product ? supplierMap.get(product.supplierId) : undefined;
    const supplierLeadTimeDays = supplier?.leadTimeDays ?? 14;
    // Null when there were no sales in the trailing window. Never substitute a
    // made-up rate: anything sized from demand (reorder qty, cover, value at
    // risk) is left out instead.
    const demand = insight.averageDailyDemand !== null && insight.averageDailyDemand > 0 ? insight.averageDailyDemand : null;

    const daysOfCover = insight.daysOfStock !== null ? Math.round(insight.daysOfStock) : 0;
    const isStockoutImminent =
      insight.availableQuantity <= 0 ||
      (insight.daysOfStock !== null && insight.daysOfStock < supplierLeadTimeDays) ||
      insight.status === "stock_out_risk";

    // Open PO inbound calculation — overdue POs are excluded from available/pipeline
    // inventory here (see inventory-availability.ts), so a stockout alert can never
    // credit stock that the procurement alert on the same page flags as overdue.
    const skuOpenPOs = openPOsBySku.get(insight.sku) ?? [];
    const { effectivePos, effectiveQuantity: inboundQty, excludedOverduePos } = splitEffectivePipeline(skuOpenPOs, today);

    // Target stock proportional to lead time
    const safetyBufferDays = Math.max(2, Math.round(supplierLeadTimeDays * 0.5));
    let suggestedQty: number | null = null;
    if (demand !== null) {
      const targetStock = Math.round(demand * (supplierLeadTimeDays + safetyBufferDays));
      suggestedQty = Math.max(0, targetStock - insight.availableQuantity - inboundQty);
      if (suggestedQty > 200) suggestedQty = Math.ceil(suggestedQty / 50) * 50;
      else if (suggestedQty > 20) suggestedQty = Math.ceil(suggestedQty / 10) * 10;
    }
    const noDemandTeaser = "No sales in the last 90 days, so there's no demand rate to size a reorder from.";

    // "Effective cover" = on-hand plus only the in-transit quantity that is still
    // credible (not overdue) — the number the reorder decision is actually based on.
    const effectiveCoverDays = demand !== null ? Math.round(((insight.availableQuantity + inboundQty) / demand) * 10) / 10 : daysOfCover;
    const excludedNote = excludedOverduePos
      .map(
        (po) =>
          `${po.quantity.toLocaleString()} units on ${po.poNumber}, but that PO is ${po.daysOverdue} day${po.daysOverdue === 1 ? "" : "s"} overdue — excluded from available stock`,
      )
      .join("; ");

    if (isStockoutImminent) {
      // Tier 1: Stockout imminent (days of cover < supplier lead time).
      // Unknown demand → no value-at-risk estimate; it ranks last within the tier.
      const valueAtRisk = demand !== null ? demand * supplierLeadTimeDays * unitCost : 0;
      const inboundNote =
        inboundQty > 0
          ? ` (${inboundQty.toLocaleString()} units already in transit on ${effectivePos[0]?.poNumber})`
          : "";

      const descriptionParts = [`Below reorder point. Supplier lead time is ${supplierLeadTimeDays} days${inboundNote}.`];
      if (excludedNote) descriptionParts.push(`${excludedNote}. Effective cover: ${Math.round(effectiveCoverDays)} days.`);

      const teaser =
        suggestedQty === null
          ? noDemandTeaser
          : suggestedQty > 0
          ? `Growth plans would order ${suggestedQty.toLocaleString()} units from ${product?.supplierId || "primary supplier"} today — upgrade to generate this PO.`
          : `Inbound PO ${effectivePos[0]?.poNumber || "in transit"} covers replenishment target.`;

      rankedAlerts.push({
        id: `ALT-INV-STOCKOUT-${insight.sku}-${insight.warehouseId}`,
        category: "inventory",
        severity: "critical",
        title: `${insight.sku} at ${warehouseCode} — ${daysOfCover} days until stockout`,
        description: descriptionParts.join(" "),
        sku: insight.sku,
        warehouseId: insight.warehouseId,
        teaser,
        suggestedQuantity: suggestedQty ?? undefined,
        estimatedCost: suggestedQty === null ? undefined : Math.round(suggestedQty * unitCost * 100) / 100,
        createdAt: now,
        tier: 1,
        valueAtRisk,
      });
    } else if (insight.status === "low_stock" || insight.availableQuantity < insight.reorderPoint) {
      // Tier 3: Low stock (below reorder point but still covered)
      const valueAtRisk = (insight.reorderPoint - insight.availableQuantity) * unitCost;
      const inboundNote =
        inboundQty > 0
          ? ` (${inboundQty.toLocaleString()} units inbound on ${effectivePos[0]?.poNumber})`
          : "";

      const descriptionParts = [`Below reorder point. Supplier lead time is ${supplierLeadTimeDays} days${inboundNote}.`];
      if (excludedNote) descriptionParts.push(`${excludedNote}. Effective cover: ${Math.round(effectiveCoverDays)} days.`);

      const teaser =
        suggestedQty === null
          ? noDemandTeaser
          : suggestedQty > 0
          ? `Growth plans would order ${suggestedQty.toLocaleString()} units from ${product?.supplierId || "primary supplier"} today — upgrade to generate this PO.`
          : `Inbound PO ${effectivePos[0]?.poNumber || "in transit"} covers replenishment target.`;

      rankedAlerts.push({
        id: `ALT-INV-LOW-${insight.sku}-${insight.warehouseId}`,
        category: "inventory",
        severity: "warning",
        title: `${insight.sku} at ${warehouseCode} — ${daysOfCover} days of cover`,
        description: descriptionParts.join(" "),
        sku: insight.sku,
        warehouseId: insight.warehouseId,
        teaser,
        suggestedQuantity: suggestedQty ?? undefined,
        estimatedCost: suggestedQty === null ? undefined : Math.round(suggestedQty * unitCost * 100) / 100,
        createdAt: now,
        tier: 3,
        valueAtRisk,
      });
    } else if (insight.status === "overstock" || insight.availableQuantity > insight.overstockThreshold) {
      // Collect overstocked positions for W2 aggregate rollup
      const excessUnits = Math.max(0, insight.availableQuantity - insight.overstockThreshold);
      const tiedUpDollars = Math.round((excessUnits > 0 ? excessUnits : insight.availableQuantity) * unitCost);
      overstockedPositions.push({
        sku: insight.sku,
        warehouseId: insight.warehouseId,
        excessUnits,
        tiedUpDollars,
      });
    }
  }

  // W2: Roll overstocked positions up into ONE single aggregate alert on Overview
  if (overstockedPositions.length > 0) {
    const totalTiedUp = overstockedPositions.reduce((sum, p) => sum + p.tiedUpDollars, 0);
    const tiedUpFormatted =
      totalTiedUp >= 1000000
        ? `$${(totalTiedUp / 1000000).toFixed(1)}M`
        : totalTiedUp >= 1000
        ? `$${Math.round(totalTiedUp / 1000)}k`
        : `$${Math.round(totalTiedUp).toLocaleString()}`;

    rankedAlerts.push({
      id: "ALT-INV-OVERSTOCK-AGGREGATE",
      category: "inventory",
      severity: "warning",
      title: `${overstockedPositions.length} positions overstocked — ${tiedUpFormatted} tied up`,
      description: `Excess stock across ${overstockedPositions.length} warehouse positions holding capital above 3x lead-time targets. Tap to view and triage all overstocked items in Inventory.`,
      teaser: "View overstocked positions in Inventory",
      createdAt: now,
      tier: 4,
      valueAtRisk: totalTiedUp,
    });
  }

  // 2. Overdue PO Alerts (Tier 2: expected date passed, nothing received)
  for (const po of openPOs) {
    if (po.expectedDate < today) {
      const daysOverdue = Math.max(1, daysBetween(po.expectedDate, today));
      const valueAtRisk = po.quantity * po.unitPrice;

      rankedAlerts.push({
        id: `ALT-PO-${po.poNumber}`,
        category: "procurement",
        severity: "critical",
        title: `${po.poNumber} from ${po.supplierId} — ${daysOverdue} days overdue`,
        description: `Expected ${po.expectedDate}, nothing received. ${po.quantity} units of ${po.sku}.`,
        sku: po.sku,
        supplierId: po.supplierId,
        createdAt: now,
        tier: 2,
        valueAtRisk,
      });
    }
  }

  // 3. Supplier Underperformance Alerts (Tier 5: critical suppliers only)
  for (const perf of supplierPerf) {
    if (perf.otifPercent !== null && perf.otifPercent < 70 && perf.eligiblePurchaseOrders >= 2) {
      const supplier = supplierMap.get(perf.supplierId);
      const supplierName = supplier?.name ?? perf.supplierId;
      const lateCount = perf.eligiblePurchaseOrders - perf.onTimeInFullCount;
      const valueAtRisk = perf.totalSpend * (1 - perf.otifPercent / 100);

      rankedAlerts.push({
        id: `ALT-SUP-${perf.supplierId}`,
        category: "supplier",
        severity: perf.otifPercent < 50 ? "critical" : "warning",
        title: `${perf.supplierId} (${supplierName}) — ${perf.otifPercent}% OTIF`,
        description: `${lateCount} of ${perf.eligiblePurchaseOrders} orders late or incomplete over trailing ${perf.windowDays} days.`,
        supplierId: perf.supplierId,
        createdAt: now,
        tier: 5,
        valueAtRisk,
      });
    }
  }

  // Sort by Tier ASC (1: Stockout imminent, 2: Overdue PO, 3: Low stock, 4: Overstock Aggregate, 5: Supplier)
  // Within a tier, sort by valueAtRisk DESC (highest dollar value at risk first)
  rankedAlerts.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    return b.valueAtRisk - a.valueAtRisk;
  });

  return rankedAlerts;
}
