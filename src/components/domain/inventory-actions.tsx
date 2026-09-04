"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SectionImportModal } from "./section-import-modal";
import { createProductAction, adjustStockAction } from "@/app/actions/domain";
import type { Warehouse, Supplier } from "@/types/supply-chain";
import { Plus, Package, SlidersHorizontal, Upload, AlertCircle } from "lucide-react";

export function InventoryActions({
  warehouses,
  suppliers,
}: {
  warehouses: Warehouse[];
  suppliers: Supplier[];
}) {
  const [productOpen, setProductOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [importProductsOpen, setImportProductsOpen] = useState(false);
  const [importInventoryOpen, setImportInventoryOpen] = useState(false);
  const [importTransactionsOpen, setImportTransactionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // New Product Form State
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [unitCost, setUnitCost] = useState("");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.supplierId || "");

  // Adjust Stock Form State
  const [stockSku, setStockSku] = useState("");
  const [stockWarehouseId, setStockWarehouseId] = useState(String(warehouses[0]?.id || ""));
  const [quantityOnHand, setQuantityOnHand] = useState("");

  function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!sku || !name || !supplierId) {
      setError("Please fill out SKU, Product Name, and select a Supplier.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await createProductAction({
        sku,
        name,
        category,
        unitCost: Number(unitCost) || 0,
        supplierId,
      });

      if (res.success) {
        setSku("");
        setName("");
        setCategory("general");
        setUnitCost("");
        setProductOpen(false);
      } else {
        setError(res.error || "Failed to create product.");
      }
    });
  }

  function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    if (!stockSku || !stockWarehouseId) {
      setError("Please enter SKU and select a Warehouse.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await adjustStockAction({
        sku: stockSku,
        warehouseId: Number(stockWarehouseId),
        quantityOnHand: Number(quantityOnHand) || 0,
      });

      if (res.success) {
        setStockSku("");
        setQuantityOnHand("");
        setStockOpen(false);
      } else {
        setError(res.error || "Failed to update stock balance.");
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setImportProductsOpen(true)} className="gap-1.5">
          <Upload size={14} />
          Import Products
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setImportInventoryOpen(true)} className="gap-1.5">
          <Upload size={14} />
          Import Balances
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setImportTransactionsOpen(true)} className="gap-1.5">
          <Upload size={14} />
          Import Transactions
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setStockOpen(true)} className="gap-1.5">
          <SlidersHorizontal size={14} />
          Adjust Stock
        </Button>
        <Button size="sm" onClick={() => setProductOpen(true)} className="gap-1.5">
          <Plus size={14} />
          Add Product
        </Button>
      </div>

      {/* Add Product Modal */}
      <Modal open={productOpen} onClose={() => setProductOpen(false)} title="Add Product to Master Catalog">
        <div className="mb-4 flex items-center justify-between rounded-lg bg-(--color-surface-secondary) p-3 text-small">
          <span className="text-(--color-text-secondary)">Have a CSV or Excel spreadsheet of products?</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setProductOpen(false);
              setImportProductsOpen(true);
            }}
            className="text-(--color-brand) hover:underline text-caption gap-1"
          >
            <Upload size={13} />
            Import File Instead →
          </Button>
        </div>

        <form onSubmit={handleCreateProduct} className="space-y-4">
          {error && (
            <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-small text-red-500">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                SKU *
              </label>
              <input
                type="text"
                placeholder="e.g. SKU-1045"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Unit Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="24.50"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Product Name *
            </label>
            <input
              type="text"
              placeholder="e.g. High Pressure Hydraulic Coupling"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. valves, fasteners"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Primary Supplier *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
                required
              >
                {suppliers.length === 0 ? (
                  <option value="">No suppliers found</option>
                ) : (
                  suppliers.map((s) => (
                    <option key={s.supplierId} value={s.supplierId}>
                      {s.name} ({s.supplierId})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-(--color-border)">
            <Button type="button" variant="ghost" size="sm" onClick={() => setProductOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              <Package size={14} />
              {isPending ? "Saving..." : "Create Product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={stockOpen} onClose={() => setStockOpen(false)} title="Update Inventory Stock Balance">
        <form onSubmit={handleAdjustStock} className="space-y-4">
          {error && (
            <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-small text-red-500">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Product SKU *
            </label>
            <input
              type="text"
              placeholder="e.g. SKU-1001"
              value={stockSku}
              onChange={(e) => setStockSku(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Warehouse *
              </label>
              <select
                value={stockWarehouseId}
                onChange={(e) => setStockWarehouseId(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
                required
              >
                {warehouses.length === 0 ? (
                  <option value="">No warehouses found</option>
                ) : (
                  warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                New On-Hand Quantity *
              </label>
              <input
                type="number"
                placeholder="1500"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-(--color-border)">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStockOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              <SlidersHorizontal size={14} />
              {isPending ? "Saving..." : "Update Stock"}
            </Button>
          </div>
        </form>
      </Modal>

      <SectionImportModal open={importProductsOpen} onClose={() => setImportProductsOpen(false)} type="products" />
      <SectionImportModal open={importInventoryOpen} onClose={() => setImportInventoryOpen(false)} type="inventory" />
      <SectionImportModal open={importTransactionsOpen} onClose={() => setImportTransactionsOpen(false)} type="transactions" />
    </>
  );
}
