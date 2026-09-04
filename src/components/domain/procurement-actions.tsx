"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SectionImportModal } from "./section-import-modal";
import { createPurchaseOrderAction } from "@/app/actions/domain";
import type { Supplier, Product } from "@/types/supply-chain";
import { Plus, ShoppingCart, Upload, AlertCircle } from "lucide-react";

export function ProcurementActions({
  suppliers,
  products,
}: {
  suppliers: Supplier[];
  products: Product[];
}) {
  const [poOpen, setPoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [poNumber, setPoNumber] = useState("");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.supplierId || "");
  const [sku, setSku] = useState(products[0]?.sku || "");
  const [quantity, setQuantity] = useState("500");
  const [unitPrice, setUnitPrice] = useState(products[0]?.unitCost ? String(products[0].unitCost) : "10.00");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));

  // Default expected date = order date + 14 days
  const defaultExp = new Date();
  defaultExp.setDate(defaultExp.getDate() + 14);
  const [expectedDate, setExpectedDate] = useState(defaultExp.toISOString().slice(0, 10));

  function handleProductChange(newSku: string) {
    setSku(newSku);
    const prod = products.find((p) => p.sku === newSku);
    if (prod) {
      setUnitPrice(String(prod.unitCost));
      if (prod.supplierId) setSupplierId(prod.supplierId);
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!poNumber || !supplierId || !sku || !quantity || !unitPrice || !orderDate || !expectedDate) {
      setError("Please fill out all required fields.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await createPurchaseOrderAction({
        poNumber,
        supplierId,
        sku,
        quantity: Number(quantity) || 0,
        unitPrice: Number(unitPrice) || 0,
        orderDate,
        expectedDate,
      });

      if (res.success) {
        setPoNumber("");
        setPoOpen(false);
      } else {
        setError(res.error || "Failed to create purchase order.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
          <Upload size={14} />
          Import POs
        </Button>
        <Button size="sm" onClick={() => setPoOpen(true)} className="gap-1.5">
          <Plus size={14} />
          New Purchase Order
        </Button>
      </div>

      <Modal open={poOpen} onClose={() => setPoOpen(false)} title="Issue New Purchase Order" className="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-small text-red-500">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                PO Number *
              </label>
              <input
                type="text"
                placeholder="e.g. PO-2026-001"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Supplier *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
                required
              >
                {suppliers.map((s) => (
                  <option key={s.supplierId} value={s.supplierId}>
                    {s.name} ({s.supplierId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Product SKU *
            </label>
            <select
              value={sku}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              required
            >
              {products.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku} — {p.name} (${p.unitCost.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Quantity *
              </label>
              <input
                type="number"
                placeholder="500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Unit Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="12.50"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Order Date *
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Expected Delivery Date *
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-(--color-border)">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPoOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              <ShoppingCart size={14} />
              {isPending ? "Creating..." : "Issue Purchase Order"}
            </Button>
          </div>
        </form>
      </Modal>

      <SectionImportModal open={importOpen} onClose={() => setImportOpen(false)} type="purchase_orders" />
    </>
  );
}
