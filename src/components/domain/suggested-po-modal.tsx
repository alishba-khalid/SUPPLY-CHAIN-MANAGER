"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createPoFromSuggestionAction } from "@/app/actions/subscription";
import type { SuggestedPurchaseOrder } from "@/lib/forecasting/demand-forecast";
import { knownPositive, parsePositiveInput, type PoDraft } from "@/lib/insights/quick-order";
import { Zap, CheckCircle2, AlertCircle } from "lucide-react";

const inputClass =
  "w-full rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none";

export function SuggestedPoModal({
  suggestion,
  open,
  onClose,
}: {
  suggestion: PoDraft | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!suggestion) return null;
  // Keyed so typed-in values and messages reset for each new suggestion.
  return <SuggestedPoForm key={suggestion.id} suggestion={suggestion} open={open} onClose={onClose} />;
}

function SuggestedPoForm({ suggestion, open, onClose }: { suggestion: PoDraft; open: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [quantityText, setQuantityText] = useState("");
  const [unitPriceText, setUnitPriceText] = useState("");

  // Missing, 0 or below all count as unknown — the user must enter a real value.
  const knownQuantity = knownPositive(suggestion.suggestedQuantity);
  const knownUnitPrice = knownPositive(suggestion.unitPrice);
  const quantityMissing = knownQuantity === null;
  const unitPriceMissing = knownUnitPrice === null;
  const quantity = knownQuantity ?? parsePositiveInput(quantityText, true);
  const unitPrice = knownUnitPrice ?? parsePositiveInput(unitPriceText, false);
  const estimatedCost = quantity !== null && unitPrice !== null ? Math.round(quantity * unitPrice * 100) / 100 : null;

  function handleCreatePo() {
    if (quantity === null || unitPrice === null || estimatedCost === null) return;
    setError(null);

    const po: SuggestedPurchaseOrder = { ...suggestion, suggestedQuantity: quantity, unitPrice, estimatedCost };
    startTransition(async () => {
      const res = await createPoFromSuggestionAction(po);
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

  const missing = [quantityMissing && "order quantity", unitPriceMissing && "unit cost"].filter(Boolean).join(" and ");

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

        {missing && (
          <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-small text-amber-700 dark:text-amber-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>No {missing} on file for this SKU. Enter the real value to issue the PO.</div>
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
              <label htmlFor="po-quantity" className="text-(--color-text-muted)">
                Order Quantity:
              </label>
              {quantityMissing ? (
                <input
                  id="po-quantity"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="Unknown — enter units"
                  value={quantityText}
                  onChange={(e) => setQuantityText(e.target.value)}
                  className={inputClass}
                />
              ) : (
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-body">
                  {knownQuantity!.toLocaleString()} units
                </p>
              )}
            </div>
            <div>
              <label htmlFor="po-unit-price" className="text-(--color-text-muted)">
                Unit Cost:
              </label>
              {unitPriceMissing ? (
                <input
                  id="po-unit-price"
                  type="number"
                  min={0.01}
                  step="any"
                  inputMode="decimal"
                  placeholder="Unknown — enter $/unit"
                  value={unitPriceText}
                  onChange={(e) => setUnitPriceText(e.target.value)}
                  className={inputClass}
                />
              ) : (
                <p className="font-medium text-(--color-text-primary)">${knownUnitPrice!.toLocaleString()}</p>
              )}
            </div>
            <div className="col-span-2">
              <span className="text-(--color-text-muted)">Est. Spend:</span>
              <p className="font-semibold text-(--color-text-primary) text-body">
                {estimatedCost !== null ? `$${estimatedCost.toLocaleString()}` : "—"}
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
          <Button onClick={handleCreatePo} disabled={isPending || estimatedCost === null} className="gap-1.5">
            <Zap size={14} />
            {isPending ? "Issuing PO..." : "Confirm & Issue PO"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
