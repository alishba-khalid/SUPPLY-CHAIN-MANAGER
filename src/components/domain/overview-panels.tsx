"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Package, Truck, Warehouse as WarehouseIcon } from "lucide-react";
import type { Product, Recommendation, Supplier, SupplyChainAlert, Warehouse } from "@/types/supply-chain";
import { AlertCard } from "./alert-card";
import { RecommendationCard } from "./recommendation-card";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";

const DISMISSED_ALERTS_KEY = "scm.dismissedAlerts";
const RESOLVED_RECOMMENDATIONS_KEY = "scm.resolvedRecommendations";

/** A localStorage-backed set of ids, following the same subscribe/snapshot pattern as the sidebar's collapsed preference. */
function createIdSetStore(key: string) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedSet: Set<string> = new Set();

  function getSnapshot(): Set<string> {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null;
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSet = raw ? new Set(JSON.parse(raw)) : new Set();
    }
    return cachedSet;
  }

  function getServerSnapshot(): Set<string> {
    return cachedSet;
  }

  function subscribe(callback: () => void) {
    listeners.add(callback);
    window.addEventListener("storage", callback);
    return () => {
      listeners.delete(callback);
      window.removeEventListener("storage", callback);
    };
  }

  function add(id: string) {
    const next = new Set(getSnapshot()).add(id);
    const raw = JSON.stringify([...next]);
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      // localStorage unavailable — the choice just won't persist
    }
    cachedRaw = raw;
    cachedSet = next;
    listeners.forEach((callback) => callback());
  }

  return { getSnapshot, getServerSnapshot, subscribe, add };
}

import { SuggestedPoModal } from "./suggested-po-modal";
import type { SuggestedPurchaseOrder } from "@/lib/forecasting/demand-forecast";

const dismissedAlertsStore = createIdSetStore(DISMISSED_ALERTS_KEY);
const resolvedRecommendationsStore = createIdSetStore(RESOLVED_RECOMMENDATIONS_KEY);

type DetailTarget = { sku?: string; supplierId?: string; warehouseId?: number; description: string };

export function OverviewPanels({
  alerts,
  recommendations,
  products,
  suppliers,
  warehouses,
  isStarter = false,
}: {
  alerts: SupplyChainAlert[];
  recommendations: Recommendation[];
  products: Product[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  isStarter?: boolean;
}) {
  const dismissedAlerts = useSyncExternalStore(
    dismissedAlertsStore.subscribe,
    dismissedAlertsStore.getSnapshot,
    dismissedAlertsStore.getServerSnapshot,
  );
  const resolvedRecommendations = useSyncExternalStore(
    resolvedRecommendationsStore.subscribe,
    resolvedRecommendationsStore.getSnapshot,
    resolvedRecommendationsStore.getServerSnapshot,
  );
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<SuggestedPurchaseOrder | null>(null);

  const productBySku = useMemo(() => new Map(products.map((p) => [p.sku, p])), [products]);
  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.supplierId, s])), [suppliers]);
  const warehouseById = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);

  function dismissAlert(id: string) {
    dismissedAlertsStore.add(id);
  }

  function resolveRecommendation(id: string) {
    resolvedRecommendationsStore.add(id);
  }

  function handleQuickOrder(alert: SupplyChainAlert) {
    if (!alert.sku) return;
    const product = productBySku.get(alert.sku);
    const supplier = product ? supplierById.get(product.supplierId) : undefined;
    const warehouse = alert.warehouseId ? warehouseById.get(alert.warehouseId) : undefined;

    const suggestion: SuggestedPurchaseOrder = {
      id: `SUG-${alert.id}`,
      sku: alert.sku,
      productName: product?.name || alert.sku,
      category: product?.category || "general",
      supplierId: product?.supplierId || alert.supplierId || "SUP-001",
      supplierName: supplier?.name || "Primary Supplier",
      supplierLeadTimeDays: supplier?.leadTimeDays || 14,
      warehouseId: alert.warehouseId || 1,
      warehouseCode: warehouse?.code || "WH-1",
      currentOnHand: 0,
      targetStock: alert.suggestedQuantity || 500,
      inboundQuantity: 0,
      reorderPoint: 0,
      dailyDemand: 0,
      dailyDemandSigma: 0,
      safetyStock: 0,
      suggestedQuantity: alert.suggestedQuantity || 500,
      actionType: "reorder",
      unitPrice: product?.unitCost || 10,
      estimatedCost: alert.estimatedCost || (alert.suggestedQuantity || 500) * (product?.unitCost || 10),
      daysOfCoverCurrent: null,
      daysOfCoverProjected: 30,
      reasoning: alert.description,
    };

    setActiveSuggestion(suggestion);
  }

  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.has(a.id));
  const visibleRecommendations = recommendations.filter((r) => !resolvedRecommendations.has(r.id));

  return (
    <>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <SectionHeader
            title="Needs Attention"
            description={`${visibleAlerts.length} open alert${visibleAlerts.length === 1 ? "" : "s"}`}
          />
          {visibleAlerts.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={18} />}
              title="Nothing needs attention."
              description="Your supply chain is operating within healthy ranges."
            />
          ) : (
            <div className="space-y-2">
              {visibleAlerts.slice(0, 5).map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  isStarter={isStarter}
                  onQuickOrder={handleQuickOrder}
                  actions={
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          setDetail({
                            sku: alert.sku,
                            supplierId: alert.supplierId,
                            warehouseId: alert.warehouseId,
                            description: alert.description,
                          })
                        }
                      >
                        Details
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => dismissAlert(alert.id)}>
                        Dismiss
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="Recommended Actions"
            description={`${visibleRecommendations.length} recommendation${visibleRecommendations.length === 1 ? "" : "s"}`}
          />
          {visibleRecommendations.length === 0 ? (
            <EmptyState title="No recommendations right now." />
          ) : (
            <div className="space-y-2">
              {visibleRecommendations.slice(0, 5).map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  actions={
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          setDetail({
                            sku: rec.affectedSkus?.[0],
                            supplierId: rec.affectedSupplierId,
                            warehouseId: rec.affectedWarehouseId,
                            description: rec.description,
                          })
                        }
                      >
                        Details
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => resolveRecommendation(rec.id)}>
                        Mark done
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Drawer open={detail !== null} onClose={() => setDetail(null)} title="Details">
        {detail && (
          <div className="space-y-5">
            <p className="text-body text-(--color-text-secondary)">{detail.description}</p>

            {detail.sku &&
              (() => {
                const product = productBySku.get(detail.sku!);
                return (
                  <div className="space-y-1 rounded-lg border border-(--color-border) p-4">
                    <div className="flex items-center gap-2 text-small font-medium text-(--color-text-primary)">
                      <Package size={16} /> Product
                    </div>
                    <p className="text-body text-(--color-text-primary)">{product?.name ?? detail.sku}</p>
                    {product && (
                      <p className="text-small text-(--color-text-muted)">
                        {product.sku} · {product.category.replace("_", " ")} · ${product.unitCost.toFixed(2)}/unit
                      </p>
                    )}
                  </div>
                );
              })()}

            {detail.supplierId &&
              (() => {
                const supplier = supplierById.get(detail.supplierId!);
                return (
                  <div className="space-y-1 rounded-lg border border-(--color-border) p-4">
                    <div className="flex items-center gap-2 text-small font-medium text-(--color-text-primary)">
                      <Truck size={16} /> Supplier
                    </div>
                    <p className="text-body text-(--color-text-primary)">{supplier?.name ?? detail.supplierId}</p>
                    {supplier && (
                      <p className="text-small text-(--color-text-muted)">
                        {supplier.leadTimeDays}-day lead time · {supplier.email}
                      </p>
                    )}
                  </div>
                );
              })()}

            {detail.warehouseId !== undefined &&
              (() => {
                const warehouse = warehouseById.get(detail.warehouseId!);
                return (
                  <div className="space-y-1 rounded-lg border border-(--color-border) p-4">
                    <div className="flex items-center gap-2 text-small font-medium text-(--color-text-primary)">
                      <WarehouseIcon size={16} /> Warehouse
                    </div>
                    <p className="text-body text-(--color-text-primary)">{warehouse?.name ?? detail.warehouseId}</p>
                    {warehouse && (
                      <p className="text-small text-(--color-text-muted)">
                        {warehouse.code} · {warehouse.capacityUnits.toLocaleString()} unit capacity
                      </p>
                    )}
                  </div>
                );
              })()}
          </div>
        )}
      </Drawer>

      <SuggestedPoModal
        open={activeSuggestion !== null}
        onClose={() => setActiveSuggestion(null)}
        suggestion={activeSuggestion}
      />
    </>
  );
}
