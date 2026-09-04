"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { receivePurchaseOrderAction } from "@/app/actions/domain";
import type { PurchaseOrder, Warehouse } from "@/types/supply-chain";
import { CheckCircle2, Ship, AlertCircle } from "lucide-react";

export function LogisticsActions({
  openPOs,
  warehouses,
}: {
  openPOs: PurchaseOrder[];
  warehouses: Warehouse[];
}) {
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [selectedPo, setSelectedPo] = useState(openPOs[0]?.poNumber || "");
  const [warehouseId, setWarehouseId] = useState(String(warehouses[0]?.id || ""));
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));

  function handleReceive(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPo || !receivedDate) {
      setError("Please select a Purchase Order and Received Date.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await receivePurchaseOrderAction({
        poNumber: selectedPo,
        receivedDate,
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
      });

      if (res.success) {
        setReceiveOpen(false);
      } else {
        setError(res.error || "Failed to receive shipment.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => setReceiveOpen(true)}
          disabled={openPOs.length === 0}
          className="gap-1.5"
        >
          <CheckCircle2 size={14} />
          Log Inbound Delivery
        </Button>
      </div>

      <Modal open={receiveOpen} onClose={() => setReceiveOpen(false)} title="Receive Inbound Shipment" className="max-w-md">
        <form onSubmit={handleReceive} className="space-y-4">
          {error && (
            <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-small text-red-500">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Select In-Transit PO *
            </label>
            <select
              value={selectedPo}
              onChange={(e) => setSelectedPo(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              required
            >
              {openPOs.map((po) => (
                <option key={po.poNumber} value={po.poNumber}>
                  {po.poNumber} — {po.sku} ({po.quantity} units)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Receiving Warehouse
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Actual Received Date *
            </label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-(--color-border)">
            <Button type="button" variant="ghost" size="sm" onClick={() => setReceiveOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              <Ship size={14} />
              {isPending ? "Updating..." : "Confirm Received"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
