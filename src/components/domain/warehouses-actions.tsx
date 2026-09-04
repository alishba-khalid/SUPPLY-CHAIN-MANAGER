"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SectionImportModal } from "./section-import-modal";
import { createWarehouseAction } from "@/app/actions/domain";
import { Plus, Upload, Warehouse as WarehouseIcon, AlertCircle } from "lucide-react";

export function WarehousesActions() {
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [capacityUnits, setCapacityUnits] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name) {
      setError("Please fill out Warehouse Code and Name.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await createWarehouseAction({
        code,
        name,
        capacityUnits: Number(capacityUnits) || 0,
      });

      if (res.success) {
        setCode("");
        setName("");
        setCapacityUnits("");
        setAddOpen(false);
      } else {
        setError(res.error || "Failed to create warehouse.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
          <Upload size={14} />
          Import
        </Button>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus size={14} />
          Add Warehouse
        </Button>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Warehouse">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-small text-red-500">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Warehouse Code *
            </label>
            <input
              type="text"
              placeholder="e.g. WH-SOUTH, NDC"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Facility Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Southern Regional Hub"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Total Storage Capacity (Units)
            </label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={capacityUnits}
              onChange={(e) => setCapacityUnits(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-(--color-border)">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              <WarehouseIcon size={14} />
              {isPending ? "Saving..." : "Create Warehouse"}
            </Button>
          </div>
        </form>
      </Modal>

      <SectionImportModal open={importOpen} onClose={() => setImportOpen(false)} type="warehouses" />
    </>
  );
}
