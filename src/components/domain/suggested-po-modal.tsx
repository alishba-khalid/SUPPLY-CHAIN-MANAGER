"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createPoFromSuggestionAction } from "@/app/actions/subscription";
import type { SuggestedPurchaseOrder } from "@/lib/forecasting/demand-forecast";
import { Zap, CheckCircle2, AlertCircle } from "lucide-react";

export function SuggestedPoModal({
  suggestion,
  open,
  onClose,
}: {
  suggestion: SuggestedPurchaseOrder | null;
  open: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!suggestion) return null;

  function handleCreatePo() {
    if (!suggestion) return;
    setError(null);

    startTransition(async () => {
      const res = await createPoFromSuggestionAction(suggestion);
      if (res.success) {
        setSuccessMsg((res as { message?: string }).message || `Purchase Order generated successfully!`);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1500);
      } else {
        const errorText = (res as { error?: string }).error || "Failed to create Purchase Order.";
        setError(errorText);
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="1-Click Purchase Order Generation">
      <div className="space-y-4">
        {error && (
          <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-small text-red-500">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="flex gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-small text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <div>{successMsg}</div>
          </div>
        )}

        <div className="rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-4 space-y-3">
          <div className="flex justify-between items-start border-b border-(--color-border) pb-2">
            <div>
              <p className="font-semibold text-body text-(--color-text-primary)">{suggestion.productName}</p>
              <p className="text-small text-(--color-text-muted)">SKU: {suggestion.sku}</p>
            </div>
            <span className="rounded bg-(--color-surface) px-2 py-0.5 text-caption font-medium border border-(--color-border)">
              {suggestion.warehouseCode}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-small">
            <div>
              <span className="text-(--color-text-muted)">Supplier:</span>
              <p className="font-medium text-(--color-text-primary)">
                {suggestion.supplierName} ({suggestion.supplierId})
              </p>
            </div>
            <div>
              <span className="text-(--color-text-muted)">Lead Time:</span>
              <p className="font-medium text-(--color-text-primary)">{suggestion.supplierLeadTimeDays} days</p>
            </div>
            <div>
              <span className="text-(--color-text-muted)">Order Quantity:</span>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-body">
                {suggestion.suggestedQuantity.toLocaleString()} units
              </p>
            </div>
            <div>
              <span className="text-(--color-text-muted)">Est. Spend:</span>
              <p className="font-semibold text-(--color-text-primary) text-body">
                ${suggestion.estimatedCost.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="pt-2 text-caption text-(--color-text-secondary) border-t border-(--color-border)">
            💡 {suggestion.reasoning}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleCreatePo} disabled={isPending} className="gap-1.5">
            <Zap size={14} />
            {isPending ? "Issuing PO..." : "Confirm & Issue PO"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
