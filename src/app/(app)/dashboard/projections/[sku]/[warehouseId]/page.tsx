import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { SawtoothChart } from "@/components/domain/sawtooth-chart";
import { ForecastModeBadge } from "@/components/domain/forecast-mode-badge";
import {
  getInventoryInsights,
  getInventoryRecords,
  getInventoryTransactions,
} from "@/data/repositories/inventory";
import { getProducts } from "@/data/repositories/products";
import { getWarehouses } from "@/data/repositories/warehouses";
import { getSuppliers } from "@/data/repositories/suppliers";
import { getPurchaseOrders } from "@/data/repositories/procurement";
import { getSkuWarehouseProjection } from "@/lib/forecasting/demand-forecast";
import { hasStoredForecast } from "@/data/repositories/forecasts";
import { requireOrgId } from "@/lib/auth";
import { checkPageRateLimit } from "@/lib/rate-limit";

export default async function SkuProjectionPage({
  params,
}: {
  params: Promise<{ sku: string; warehouseId: string }>;
}) {
  const orgId = await requireOrgId();

  const withinRateLimit = await checkPageRateLimit("projections-detail");
  if (!withinRateLimit) {
    return (
      <div>
        <PageHeader title="Stockout Projection" />
        <div className="p-8">
          <EmptyState
            icon={<Clock size={18} />}
            title="Too many requests"
            description="This page is rate-limited to protect the underlying forecasting service. Please wait a few minutes and try again."
          />
        </div>
      </div>
    );
  }

  const { sku, warehouseId: warehouseIdParam } = await params;
  const warehouseId = Number(warehouseIdParam);

  const [insights, records, products, warehouses, suppliers, purchaseOrders, transactions] = await Promise.all([
    getInventoryInsights(orgId),
    getInventoryRecords(orgId),
    getProducts(orgId),
    getWarehouses(orgId),
    getSuppliers(orgId),
    getPurchaseOrders(orgId),
    getInventoryTransactions(orgId),
  ]);

  const projection = getSkuWarehouseProjection(sku, warehouseId, {
    insights,
    records,
    products,
    suppliers,
    warehouses,
    purchaseOrders,
    transactions,
  });

  if (!projection) notFound();

  // Same shared demand math either way (see computeSkuWarehouseProjection) —
  // this only checks whether THIS series has a stored batch result yet, for
  // the mode badge. No network call either way.
  const isLive = await hasStoredForecast(orgId, sku, warehouseId);

  const statusLabel =
    projection.actionType === "expedite"
      ? "Expedite"
      : projection.actionType === "transfer"
        ? "Transfer"
        : projection.actionType === "reorder"
          ? "Reorder"
          : "Covered";

  return (
    <div>
      <PageHeader
        title={`${projection.sku} · ${projection.warehouseCode}`}
        description={projection.productName}
        actions={
          <Link
            href="/dashboard/projections"
            className="flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-2.5 py-1.5 text-caption font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface-hover) transition-colors"
          >
            <ArrowLeft size={14} /> All projections
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap items-center gap-2">
          <ForecastModeBadge liveCount={isLive ? 1 : 0} totalCount={1} />
          <span className="rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-2.5 py-1 text-caption font-medium text-(--color-text-secondary)">
            {statusLabel} · {projection.daysOfCoverCurrent?.toFixed(1) ?? "—"}d cover today
          </span>
        </div>

        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-h3 text-(--color-text-primary)">
              {projection.horizonDays}-day stockout projection
            </h3>
          </div>
          <p className="mb-4 text-small text-(--color-text-muted)">
            Falls by forecast daily demand (
            {projection.dailyDemand}/d, ±{projection.dailyDemandSigma}), stepping up on each inbound PO
            arrival. Red = stockout window, amber = below safety stock.
          </p>
          <SawtoothChart projection={projection} height={380} />
        </Card>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "On hand today", value: projection.currentOnHand.toLocaleString() },
            { label: "Reorder point", value: projection.reorderPoint.toLocaleString() },
            { label: "Safety stock", value: Math.round(projection.safetyStock).toLocaleString() },
            { label: "Target stock", value: projection.targetStock.toLocaleString() },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-caption text-(--color-text-muted)">{stat.label}</p>
              <p className="mt-1 text-h3 text-(--color-text-primary)">{stat.value}</p>
            </Card>
          ))}
        </div>

        {projection.gapArrival && (
          <Card className="border-(--color-critical)/30 bg-(--color-critical-bg) p-4">
            <p className="text-small font-semibold text-(--color-text-primary)">
              Covered through {projection.coveredThroughDate}. {projection.gapArrival.poNumber}{" "}
              {projection.gapArrival.isOverdue
                ? `(revised ETA ${projection.gapArrival.effectiveArrivalDate}, originally due ${projection.gapArrival.originalExpectedDate})`
                : `arrives ${projection.gapArrival.effectiveArrivalDate}`}
              . {projection.gapDays}-day gap before it lands.
            </p>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="mb-3 text-h3 text-(--color-text-primary)">Inbound purchase orders</h3>
          {projection.inboundPos.length === 0 ? (
            <p className="text-small text-(--color-text-muted)">No open POs land within the projection horizon.</p>
          ) : (
            <div className="space-y-2">
              {projection.inboundPos.map((po) => (
                <div
                  key={po.poNumber}
                  className="flex items-center justify-between rounded-md border border-(--color-border) px-3 py-2 text-small"
                >
                  <span className="font-medium text-(--color-text-primary)">{po.poNumber}</span>
                  <span className="text-(--color-text-secondary)">{po.quantity.toLocaleString()} units</span>
                  <span className={po.isOverdue ? "text-(--color-critical)" : "text-(--color-text-secondary)"}>
                    {po.isOverdue
                      ? `Excluded — ${po.daysOverdue}d overdue (was due ${po.originalExpectedDate})`
                      : `Arrives ${po.effectiveArrivalDate}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
