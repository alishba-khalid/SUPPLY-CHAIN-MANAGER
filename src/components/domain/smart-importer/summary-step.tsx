"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Building2,
  Package,
  Boxes,
  ShoppingCart,
  ArrowLeftRight,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import type { ImportCommitResult } from "@/lib/importer/types";

interface SummaryStepProps {
  result: ImportCommitResult;
  onReset: () => void;
}

export function SummaryStep({ result, onReset }: SummaryStepProps) {
  const counts = result.importedCounts || {
    warehouses: 0,
    suppliers: 0,
    products: 0,
    inventory: 0,
    purchaseOrders: 0,
    transactions: 0,
  };

  const totalSaved =
    counts.warehouses +
    counts.suppliers +
    counts.products +
    counts.inventory +
    counts.purchaseOrders +
    counts.transactions;

  return (
    <div className="space-y-8 py-4">
      {/* Success Banner */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={36} />
        </div>
        <div>
          <h2 className="text-h2 font-bold text-(--color-text-primary)">
            {result.simulated ? "Import Checked — Demo Data Unchanged" : "Import Completed Successfully!"}
          </h2>
          <p className="mt-1 text-body text-(--color-text-secondary) max-w-lg mx-auto">
            {result.simulated
              ? `${totalSaved.toLocaleString()} records were validated and written inside a single PostgreSQL transaction, then rolled back — this is the shared demo workspace, so its data is never changed.`
              : `${totalSaved.toLocaleString()} total records across 6 entities were committed atomically in a single PostgreSQL transaction.`}
          </p>
          {(result.duplicateTransactionsSkipped ?? 0) > 0 && (
            <p className="mt-2 text-caption text-(--color-text-muted) max-w-lg mx-auto">
              {result.duplicateTransactionsSkipped!.toLocaleString()} transactions were already in your workspace from an earlier import of the same rows and were skipped, not duplicated.
            </p>
          )}
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4 bg-(--color-surface) border border-(--color-border) text-center space-y-1">
          <Building2 size={20} className="mx-auto text-(--color-brand)" />
          <p className="text-h3 font-bold text-(--color-text-primary)">{counts.warehouses}</p>
          <p className="text-caption text-(--color-text-muted)">Warehouses</p>
        </Card>

        <Card className="p-4 bg-(--color-surface) border border-(--color-border) text-center space-y-1">
          <Building2 size={20} className="mx-auto text-emerald-500" />
          <p className="text-h3 font-bold text-(--color-text-primary)">{counts.suppliers}</p>
          <p className="text-caption text-(--color-text-muted)">Suppliers</p>
        </Card>

        <Card className="p-4 bg-(--color-surface) border border-(--color-border) text-center space-y-1">
          <Package size={20} className="mx-auto text-blue-500" />
          <p className="text-h3 font-bold text-(--color-text-primary)">{counts.products}</p>
          <p className="text-caption text-(--color-text-muted)">Products</p>
        </Card>

        <Card className="p-4 bg-(--color-surface) border border-(--color-border) text-center space-y-1">
          <Boxes size={20} className="mx-auto text-amber-500" />
          <p className="text-h3 font-bold text-(--color-text-primary)">{counts.inventory}</p>
          <p className="text-caption text-(--color-text-muted)">Inventory</p>
        </Card>

        <Card className="p-4 bg-(--color-surface) border border-(--color-border) text-center space-y-1">
          <ShoppingCart size={20} className="mx-auto text-purple-500" />
          <p className="text-h3 font-bold text-(--color-text-primary)">{counts.purchaseOrders}</p>
          <p className="text-caption text-(--color-text-muted)">Purchase Orders</p>
        </Card>

        <Card className="p-4 bg-(--color-surface) border border-(--color-border) text-center space-y-1">
          <ArrowLeftRight size={20} className="mx-auto text-indigo-500" />
          <p className="text-h3 font-bold text-(--color-text-primary)">{counts.transactions}</p>
          <p className="text-caption text-(--color-text-muted)">Transactions</p>
        </Card>
      </div>

      {/* I3: Missing Fields Reminder Callout */}
      {(result.missingLeadTimeCount > 0 || result.missingCapacityCount > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-small">
                {result.missingLeadTimeCount > 0 ? `${result.missingLeadTimeCount} supplier(s) imported without lead times (defaulting to 14 days)` : "Some fields were missing"}
                {result.missingCapacityCount > 0 ? ` · ${result.missingCapacityCount} warehouse(s) without a capacity (shown as Unknown)` : ""}
              </p>
              <p className="mt-1 text-caption text-amber-800/80 dark:text-amber-300/80 max-w-xl">
                Safety stocks and reorder recommendations are estimated until exact vendor lead times are configured.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/suppliers"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 text-small font-semibold shrink-0 transition-colors"
          >
            Configure Suppliers <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/inventory"
          className="group rounded-xl border border-(--color-border) bg-(--color-surface) p-5 hover:border-(--color-brand) hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <Package size={20} className="text-(--color-brand)" />
            <ArrowRight size={16} className="text-(--color-text-muted) group-hover:text-(--color-brand) group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="mt-3 font-semibold text-body text-(--color-text-primary)">Inventory Management</h4>
          <p className="mt-1 text-caption text-(--color-text-muted)">
            Inspect stock health, days until stockout, and suggested replenishment orders.
          </p>
        </Link>

        <Link
          href="/dashboard/procurement"
          className="group rounded-xl border border-(--color-border) bg-(--color-surface) p-5 hover:border-(--color-brand) hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <ShoppingCart size={20} className="text-purple-500" />
            <ArrowRight size={16} className="text-(--color-text-muted) group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="mt-3 font-semibold text-body text-(--color-text-primary)">Procurement & POs</h4>
          <p className="mt-1 text-caption text-(--color-text-muted)">
            Track open purchase orders, vendor on-time delivery rates, and expedites.
          </p>
        </Link>

        <Link
          href="/dashboard/suppliers"
          className="group rounded-xl border border-(--color-border) bg-(--color-surface) p-5 hover:border-(--color-brand) hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <Building2 size={20} className="text-emerald-500" />
            <ArrowRight size={16} className="text-(--color-text-muted) group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="mt-3 font-semibold text-body text-(--color-text-primary)">Suppliers & Vendors</h4>
          <p className="mt-1 text-caption text-(--color-text-muted)">
            Review supplier scores, update lead times, and manage contracts.
          </p>
        </Link>
      </div>

      {/* Action Footer */}
      <div className="flex justify-center pt-4 border-t border-(--color-border)">
        <Button variant="secondary" onClick={onReset} className="gap-2">
          <RefreshCw size={16} /> Import Another Spreadsheet
        </Button>
      </div>
    </div>
  );
}
