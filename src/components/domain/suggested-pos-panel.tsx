"use client";

import { useState } from "react";
import type { SuggestedPurchaseOrder } from "@/lib/forecasting/demand-forecast";
import { SuggestedPoModal } from "./suggested-po-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Sparkles, ArrowRight, TrendingUp, CheckCircle2, ArrowRightLeft, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/types/subscription";

export function SuggestedPosPanel({
  suggestions,
  isStarter = false,
  planId = "growth",
}: {
  suggestions: SuggestedPurchaseOrder[];
  isStarter?: boolean;
  planId?: PlanTier;
}) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedPurchaseOrder | null>(null);

  const canExecuteTransfer = planId === "professional" || planId === "enterprise";
  const canExecuteReorder = !isStarter;

  if (suggestions.length === 0) {
    return (
      <Card className="p-6 text-center space-y-2">
        <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 size={20} />
        </div>
        <h4 className="font-semibold text-body text-(--color-text-primary)">All Stock Levels Optimized</h4>
        <p className="text-small text-(--color-text-muted)">
          No purchase orders or expedite actions required based on time-phased forward projection.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="font-semibold text-body text-(--color-text-primary) flex items-center gap-2">
            <TrendingUp size={18} className="text-(--color-brand)" />
            Automated Replenishment & Expedite Actions ({suggestions.length})
          </h3>
          <p className="text-small text-(--color-text-muted)">
            Time-phased day-by-day forward projection with outlier-resistant demand, supplier delay learning, and donor solvency guards.
          </p>
        </div>

        {isStarter && (
          <Link
            href="/dashboard/settings?tab=billing"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-caption font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Sparkles size={14} /> Upgrade to Growth for 1-Click PO Generation <ArrowRight size={12} />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.slice(0, 6).map((sug) => {
          let badgeTone = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
          let badgeText = sug.currentOnHand <= 0 ? "Stockout" : `${sug.daysOfCoverCurrent ?? 0}d cover`;

          if (sug.actionType === "expedite") {
            badgeTone = "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20";
            badgeText = `Expedite (${sug.gapDays}d gap)`;
          } else if (sug.actionType === "transfer") {
            badgeTone = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
            badgeText = `Transfer (${sug.surplusWarehouseCode})`;
          }

          return (
            <div
              key={sug.id}
              className={cn(
                "flex flex-col justify-between rounded-xl border bg-(--color-surface) p-4 space-y-3 transition-all",
                sug.actionType === "expedite" || sug.actionType === "transfer"
                  ? "border-amber-500/30 bg-amber-500/5 shadow-sm"
                  : "border-(--color-border) hover:border-(--color-border-hover)"
              )}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-body text-(--color-text-primary)">{sug.productName}</p>
                    <p className="text-caption text-(--color-text-muted)">
                      {sug.sku} · {sug.warehouseCode}
                    </p>
                  </div>
                  <span className={cn("rounded px-2 py-0.5 text-caption font-semibold", badgeTone)}>
                    {badgeText}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-caption pt-1">
                  <div>
                    <span className="text-(--color-text-muted)">Supplier:</span>
                    <p className="font-medium text-(--color-text-primary) truncate">{sug.supplierName}</p>
                  </div>
                  <div>
                    <span className="text-(--color-text-muted)">Lead Time:</span>
                    <p className="font-medium text-(--color-text-primary)">{sug.supplierLeadTimeDays} days</p>
                  </div>
                  <div>
                    <span className="text-(--color-text-muted)">
                      {sug.actionType === "reorder" ? "Suggested Order:" : "Order Action:"}
                    </span>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-small">
                      {sug.suggestedQuantity > 0 ? `${sug.suggestedQuantity.toLocaleString()} units` : "0 (PO in transit)"}
                    </p>
                  </div>
                  <div>
                    <span className="text-(--color-text-muted)">Daily Demand (σ):</span>
                    <p className="font-semibold text-(--color-text-primary) text-small">
                      {sug.dailyDemand}/d (±{sug.dailyDemandSigma})
                    </p>
                  </div>
                </div>

                <p className="text-caption text-(--color-text-secondary) bg-(--color-surface-secondary) p-2 rounded-md leading-relaxed">
                  {sug.reasoning}
                </p>
              </div>

              <div className="pt-2 border-t border-(--color-border)">
                {sug.actionType === "transfer" ? (
                  canExecuteTransfer ? (
                    <Button
                      onClick={() => setSelectedSuggestion(sug)}
                      size="sm"
                      className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ArrowRightLeft size={14} /> Transfer from {sug.surplusWarehouseCode}
                    </Button>
                  ) : (
                    <Link
                      href="/dashboard/settings?tab=billing"
                      className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 py-1.5 text-caption font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      <Sparkles size={12} className="text-blue-500" /> Upgrade to Professional for 1-Click Transfer
                    </Link>
                  )
                ) : sug.actionType === "expedite" ? (
                  <a
                    href={`mailto:${sug.supplierId}@supplier.internal?subject=URGENT%20Expedite%20Request%20for%20${sug.gapInboundPoNumber}&body=Please%20expedite%20shipment%20for%20PO%20${sug.gapInboundPoNumber}%20(${sug.sku})%20to%20avoid%20imminent%20stockout.`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 py-1.5 text-small font-semibold text-white transition-colors"
                  >
                    <Clock size={14} /> Contact Supplier to Expedite ({sug.gapInboundPoNumber})
                  </a>
                ) : !canExecuteReorder ? (
                  <Link
                    href="/dashboard/settings?tab=billing"
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-(--color-surface-secondary) py-1.5 text-caption font-medium text-(--color-text-secondary) hover:text-(--color-brand) hover:bg-(--color-surface-hover) transition-colors"
                  >
                    <Sparkles size={12} className="text-amber-500" /> Upgrade to generate PO
                  </Link>
                ) : (
                  <Button
                    onClick={() => setSelectedSuggestion(sug)}
                    size="sm"
                    className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Zap size={14} /> 1-Click Order ({sug.suggestedQuantity.toLocaleString()} units)
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SuggestedPoModal
        open={selectedSuggestion !== null}
        onClose={() => setSelectedSuggestion(null)}
        suggestion={selectedSuggestion}
      />
    </div>
  );
}
