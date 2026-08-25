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

const dismissedAlertsStore = createIdSetStore(DISMISSED_ALERTS_KEY);
const resolvedRecommendationsStore = createIdSetStore(RESOLVED_RECOMMENDATIONS_KEY);

type DetailTarget = { productId?: string; supplierId?: string; warehouseId?: string; description: string };

export function OverviewPanels({
  alerts,
  recommendations,
  products,
  suppliers,
  warehouses,
}: {
  alerts: SupplyChainAlert[];
  recommendations: Recommendation[];
  products: Product[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
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

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const warehouseById = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);

  function dismissAlert(id: string) {
    dismissedAlertsStore.add(id);
  }

  function resolveRecommendation(id: string) {
    resolvedRecommendationsStore.add(id);
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
                  actions={
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDetail({
                            productId: alert.productId,
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
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDetail({
                            productId: rec.affectedProductIds?.[0],
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

            {detail.productId &&
              (() => {
                const product = productById.get(detail.productId);
                return (
                  <div className="space-y-1 rounded-lg border border-(--color-border) p-4">
                    <div className="flex items-center gap-2 text-small font-medium text-(--color-text-primary)">
                      <Package size={16} /> Product
                    </div>
                    <p className="text-body text-(--color-text-primary)">{product?.name ?? detail.productId}</p>
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
                const supplier = supplierById.get(detail.supplierId);
                return (
                  <div className="space-y-1 rounded-lg border border-(--color-border) p-4">
                    <div className="flex items-center gap-2 text-small font-medium text-(--color-text-primary)">
                      <Truck size={16} /> Supplier
                    </div>
                    <p className="text-body text-(--color-text-primary)">{supplier?.name ?? detail.supplierId}</p>
                    {supplier && (
                      <p className="text-small text-(--color-text-muted)">
                        {supplier.country} · {supplier.leadTimeDays}-day lead time · {supplier.contactName} (
                        {supplier.contactEmail})
                      </p>
                    )}
                  </div>
                );
              })()}

            {detail.warehouseId &&
              (() => {
                const warehouse = warehouseById.get(detail.warehouseId);
                return (
                  <div className="space-y-1 rounded-lg border border-(--color-border) p-4">
                    <div className="flex items-center gap-2 text-small font-medium text-(--color-text-primary)">
                      <WarehouseIcon size={16} /> Warehouse
                    </div>
                    <p className="text-body text-(--color-text-primary)">{warehouse?.name ?? detail.warehouseId}</p>
                    {warehouse && (
                      <p className="text-small text-(--color-text-muted)">
                        {warehouse.code} · {warehouse.city}, {warehouse.country} · {warehouse.capacityUnits.toLocaleString()}{" "}
                        unit capacity
                      </p>
                    )}
                  </div>
                );
              })()}
          </div>
        )}
      </Drawer>
    </>
  );
}
