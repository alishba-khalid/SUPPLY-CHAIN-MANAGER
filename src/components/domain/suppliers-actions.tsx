"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SectionImportModal } from "./section-import-modal";
import { createSupplierAction } from "@/app/actions/domain";
import { Plus, Upload, Truck, AlertCircle } from "lucide-react";

export function SuppliersActions() {
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [supplierId, setSupplierId] = useState("");
  const [name, setName] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("14");
  const [email, setEmail] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || !name) {
      setError("Please fill out Supplier ID and Name.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await createSupplierAction({
        supplierId,
        name,
        leadTimeDays: Number(leadTimeDays) || 14,
        email,
      });

      if (res.success) {
        setSupplierId("");
        setName("");
        setLeadTimeDays("14");
        setEmail("");
        setAddOpen(false);
      } else {
        setError(res.error || "Failed to create supplier.");
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
          Add Supplier
        </Button>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Supplier">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-small text-red-500">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Supplier ID *
            </label>
            <input
              type="text"
              placeholder="e.g. SUP-009, DELTA-US"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
              Company Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Apex Industrial Supplies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Lead Time (Days)
              </label>
              <input
                type="number"
                placeholder="14"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-caption font-medium text-(--color-text-secondary) uppercase tracking-wider mb-1">
                Contact Email
              </label>
              <input
                type="email"
                placeholder="orders@apex.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-(--color-border)">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              <Truck size={14} />
              {isPending ? "Saving..." : "Create Supplier"}
            </Button>
          </div>
        </form>
      </Modal>

      <SectionImportModal open={importOpen} onClose={() => setImportOpen(false)} type="suppliers" />
    </>
  );
}
