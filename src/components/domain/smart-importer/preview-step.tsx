"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Package,
  Boxes,
  ShoppingCart,
  ArrowLeftRight,
  AlertTriangle,
  AlertCircle,
  Download,
  CheckCircle2,
  ArrowLeft,
  Upload,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ExtractionPreview,
  ExtractedWarehouse,
  ExtractedSupplier,
  ExtractedProduct,
  ExtractedInventory,
  ExtractedPurchaseOrder,
  ExtractedTransaction,
  RejectedRowRecord,
} from "@/lib/importer/types";

interface PreviewStepProps {
  preview: ExtractionPreview;
  onCommitImport: (clearExisting: boolean) => void;
  onBack: () => void;
  onGoToMapping: () => void;
  isCommitting: boolean;
}

type EntityTab = "warehouses" | "suppliers" | "products" | "inventory" | "purchaseOrders" | "transactions";

const COLUMN_LABELS: Record<string, string> = {
  po_number: "PO number",
  po_quantity: "PO quantity",
  po_unit_price: "PO unit price",
  order_date: "order date",
  expected_date: "expected date",
  transaction_qty: "transaction quantity",
  transaction_direction: "direction (IN / OUT)",
  transaction_date: "transaction date",
};

export function PreviewStep({
  preview,
  onCommitImport,
  onBack,
  onGoToMapping,
  isCommitting,
}: PreviewStepProps) {
  const [activeTab, setActiveTab] = useState<EntityTab>("products");
  const [clearExisting, setClearExisting] = useState(false);
  // Records blocked by a missing column need an explicit decision: map the
  // column, or skip them. Nothing is imported with an invented value.
  const [skipBlocked, setSkipBlocked] = useState(false);
  const needsBlockedDecision = preview.blockedRecords.length > 0 && !skipBlocked;

  function downloadRejectedRowsCsv() {
    if (preview.rejectedRows.length === 0) return;
    const headers = ["Sheet", "Row Number", "Reason", "Raw Data"];
    const csvLines = [headers.join(",")];

    for (const r of preview.rejectedRows) {
      const rowNum = r.rowIndex;
      const sheet = `"${r.sheetName.replace(/"/g, '""')}"`;
      const reason = `"${r.reason.replace(/"/g, '""')}"`;
      const rawValues = Object.values(r.rawRow || {});
      const raw = `"${rawValues.map((v: unknown) => String(v ?? "")).join(" | ").replace(/"/g, '""')}"`;
      csvLines.push([sheet, String(rowNum), reason, raw].join(","));
    }

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rejected_import_rows_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-(--color-border) pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-h3 font-semibold text-(--color-text-primary)">Extraction Preview</h2>
            <Badge tone="success" className="gap-1">
              <CheckCircle2 size={12} /> Ready to Import
            </Badge>
          </div>
          <p className="mt-1 text-body text-(--color-text-secondary)">
            We mapped your file into 6 relational tables with dependency ordering. Review the extracted records below.
          </p>
        </div>
      </div>

      {/* Entity Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <button
          onClick={() => setActiveTab("warehouses")}
          className={cn(
            "flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
            activeTab === "warehouses"
              ? "border-(--color-brand) bg-(--color-brand)/5 shadow-sm"
              : "border-(--color-border) bg-(--color-surface) hover:border-(--color-border-hover)"
          )}
        >
          <div className="flex items-center justify-between text-(--color-text-muted)">
            <Building2 size={18} className="text-(--color-brand)" />
            <span className="text-caption font-semibold">WH</span>
          </div>
          <div className="mt-3">
            <p className="text-h2 font-semibold text-(--color-text-primary)">{preview.warehouses.length}</p>
            <p className="text-caption text-(--color-text-muted)">Warehouses</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("suppliers")}
          className={cn(
            "flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
            activeTab === "suppliers"
              ? "border-(--color-brand) bg-(--color-brand)/5 shadow-sm"
              : "border-(--color-border) bg-(--color-surface) hover:border-(--color-border-hover)"
          )}
        >
          <div className="flex items-center justify-between text-(--color-text-muted)">
            <Building2 size={18} className="text-emerald-500" />
            <span className="text-caption font-semibold">SUP</span>
          </div>
          <div className="mt-3">
            <p className="text-h2 font-semibold text-(--color-text-primary)">{preview.suppliers.length}</p>
            <p className="text-caption text-(--color-text-muted)">Suppliers</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("products")}
          className={cn(
            "flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
            activeTab === "products"
              ? "border-(--color-brand) bg-(--color-brand)/5 shadow-sm"
              : "border-(--color-border) bg-(--color-surface) hover:border-(--color-border-hover)"
          )}
        >
          <div className="flex items-center justify-between text-(--color-text-muted)">
            <Package size={18} className="text-blue-500" />
            <span className="text-caption font-semibold">PROD</span>
          </div>
          <div className="mt-3">
            <p className="text-h2 font-semibold text-(--color-text-primary)">{preview.products.length}</p>
            <p className="text-caption text-(--color-text-muted)">Products</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={cn(
            "flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
            activeTab === "inventory"
              ? "border-(--color-brand) bg-(--color-brand)/5 shadow-sm"
              : "border-(--color-border) bg-(--color-surface) hover:border-(--color-border-hover)"
          )}
        >
          <div className="flex items-center justify-between text-(--color-text-muted)">
            <Boxes size={18} className="text-amber-500" />
            <span className="text-caption font-semibold">INV</span>
          </div>
          <div className="mt-3">
            <p className="text-h2 font-semibold text-(--color-text-primary)">{preview.inventory.length}</p>
            <p className="text-caption text-(--color-text-muted)">Inventory Balances</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("purchaseOrders")}
          className={cn(
            "flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
            activeTab === "purchaseOrders"
              ? "border-(--color-brand) bg-(--color-brand)/5 shadow-sm"
              : "border-(--color-border) bg-(--color-surface) hover:border-(--color-border-hover)"
          )}
        >
          <div className="flex items-center justify-between text-(--color-text-muted)">
            <ShoppingCart size={18} className="text-purple-500" />
            <span className="text-caption font-semibold">PO</span>
          </div>
          <div className="mt-3">
            <p className="text-h2 font-semibold text-(--color-text-primary)">{preview.purchaseOrders.length}</p>
            <p className="text-caption text-(--color-text-muted)">Purchase Orders</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={cn(
            "flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
            activeTab === "transactions"
              ? "border-(--color-brand) bg-(--color-brand)/5 shadow-sm"
              : "border-(--color-border) bg-(--color-surface) hover:border-(--color-border-hover)"
          )}
        >
          <div className="flex items-center justify-between text-(--color-text-muted)">
            <ArrowLeftRight size={18} className="text-indigo-500" />
            <span className="text-caption font-semibold">TX</span>
          </div>
          <div className="mt-3">
            <p className="text-h2 font-semibold text-(--color-text-primary)">{preview.transactions.length}</p>
            <p className="text-caption text-(--color-text-muted)">Transactions</p>
          </div>
        </button>
      </div>

      {/* A3: Visible Fallbacks & Inferred Data Adjustments Summary */}
      {(preview.defaultWarehouseUsed ||
        preview.skuConflicts.length > 0 ||
        preview.missingLeadTimeCount > 0 ||
        preview.missingCapacityCount > 0 ||
        preview.generatedIdsCount > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-small">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Applied Defaults & Data Adjustments (Review Before Commit)</span>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-caption leading-relaxed font-medium">
            {preview.defaultWarehouseUsed && (
              <li>
                <strong>All {preview.inventory.length} stock positions</strong> assigned to <em>Primary Facility (Default)</em> — no warehouse column found in spreadsheet.
              </li>
            )}
            {preview.skuConflicts.length > 0 && (
              <li>
                <strong>{preview.skuConflicts.length} SKU(s)</strong> found under more than one supplier — resolved as:{" "}
                <span className="font-mono text-xs">
                  {preview.skuConflicts.map((c) => `${c.sku} → ${c.selectedSupplier}`).join(", ")}
                </span>
              </li>
            )}
            {preview.missingLeadTimeCount > 0 && (
              <li>
                <strong>{preview.missingLeadTimeCount} supplier(s)</strong> imported without lead times — defaulting to 14 days (reorder quantities will be estimated until configured).
              </li>
            )}
            {preview.missingCapacityCount > 0 && (
              <li>
                <strong>{preview.missingCapacityCount} warehouse(s)</strong> have no capacity in the file. Any that are new will be saved
                with a placeholder of 50,000 units — set the real capacity on the Warehouses page. Existing warehouses keep theirs.
              </li>
            )}
            {preview.generatedIdsCount > 0 && (
              <li>
                <strong>{preview.generatedIdsCount} supplier / warehouse ID(s)</strong> were generated because the file only had
                names. PO numbers and SKUs are never generated.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* I5.2: Rejected Rows Alert & Download */}
      {preview.rejectedRows.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2.5 text-small">
            <AlertCircle size={18} className="shrink-0" />
            <span>
              <strong>{preview.rejectedRows.length} rows excluded:</strong> a required value was blank or invalid, so nothing from
              those rows will be imported (no value is ever filled in for you). The CSV lists each one as &quot;Row N, column X:
              reason&quot;.
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={downloadRejectedRowsCsv}
            className="gap-1.5 text-caption font-semibold shrink-0"
          >
            <Download size={14} /> Download Rejected Rows CSV
          </Button>
        </div>
      )}

      {/* Records blocked by a missing column: map it or skip them */}
      {preview.blockedRecords.map((b) => {
        const what = b.entity === "purchase_order" ? "purchase-order" : "transaction";
        const missing = b.missingColumns.map((c) => COLUMN_LABELS[c] ?? c).join(", ");
        return (
          <div
            key={`${b.sheetName}-${b.entity}`}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-small text-amber-900 dark:text-amber-200"
          >
            <span>
              <strong>
                {missing} column{b.missingColumns.length > 1 ? "s" : ""} not found — {b.rows.toLocaleString()} {what} rows blocked
              </strong>{" "}
              in &quot;{b.sheetName}&quot;.{" "}
              {skipBlocked ? "Skipped: these will not be imported." : "Map the column, or skip these records and import the rest."}
            </span>
            {!skipBlocked && (
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={onGoToMapping}>
                  Map a column
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setSkipBlocked(true)}>
                  Skip {b.entity === "purchase_order" ? "purchase orders" : "transactions"}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Entity Table Data Sample */}
      <Card className="overflow-hidden border border-(--color-border) bg-(--color-surface)">
        <div className="p-4 bg-(--color-surface-secondary) border-b border-(--color-border) flex items-center justify-between">
          <span className="font-semibold text-small text-(--color-text-primary) uppercase tracking-wider">
            Sample Extracted {activeTab} (Showing first 5 rows)
          </span>
          <Badge tone="neutral">
            {activeTab === "warehouses" && `${preview.warehouses.length} Warehouses`}
            {activeTab === "suppliers" && `${preview.suppliers.length} Suppliers`}
            {activeTab === "products" && `${preview.products.length} Products`}
            {activeTab === "inventory" && `${preview.inventory.length} Positions`}
            {activeTab === "purchaseOrders" && `${preview.purchaseOrders.length} POs`}
            {activeTab === "transactions" && `${preview.transactions.length} Logs`}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "warehouses" && (
            <table className="w-full text-left text-small">
              <thead className="bg-(--color-surface) text-(--color-text-muted) text-caption">
                <tr className="border-b border-(--color-border)">
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Capacity Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {preview.warehouses.slice(0, 5).map((w: ExtractedWarehouse, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono font-medium">{w.code}</td>
                    <td className="px-4 py-2.5">{w.name}</td>
                    <td className="px-4 py-2.5">{w.capacityUnits.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "suppliers" && (
            <table className="w-full text-left text-small">
              <thead className="bg-(--color-surface) text-(--color-text-muted) text-caption">
                <tr className="border-b border-(--color-border)">
                  <th className="px-4 py-2.5">Supplier ID</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Lead Time (Days)</th>
                  <th className="px-4 py-2.5">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {preview.suppliers.slice(0, 5).map((s: ExtractedSupplier, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono font-medium">{s.supplierId}</td>
                    <td className="px-4 py-2.5">{s.name}</td>
                    <td className="px-4 py-2.5">
                      {s.leadTimeDays}d {s.leadTimeMissing ? <span className="text-amber-500 font-semibold">(default)</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-(--color-text-muted)">{s.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "products" && (
            <table className="w-full text-left text-small">
              <thead className="bg-(--color-surface) text-(--color-text-muted) text-caption">
                <tr className="border-b border-(--color-border)">
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Unit Cost</th>
                  <th className="px-4 py-2.5">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {preview.products.slice(0, 5).map((p: ExtractedProduct, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono font-medium">{p.sku}</td>
                    <td className="px-4 py-2.5">{p.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone="neutral">{p.category}</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      {p.unitCost === null ? <span title="No cost in the file: an existing product keeps its cost">—</span> : `$${p.unitCost.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{p.supplierId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "inventory" && (
            <table className="w-full text-left text-small">
              <thead className="bg-(--color-surface) text-(--color-text-muted) text-caption">
                <tr className="border-b border-(--color-border)">
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Warehouse</th>
                  <th className="px-4 py-2.5">On Hand Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {preview.inventory.slice(0, 5).map((inv: ExtractedInventory, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono font-medium">{inv.sku}</td>
                    <td className="px-4 py-2.5 font-mono">{inv.warehouseCode}</td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {inv.quantityOnHand.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "purchaseOrders" && (
            <table className="w-full text-left text-small">
              <thead className="bg-(--color-surface) text-(--color-text-muted) text-caption">
                <tr className="border-b border-(--color-border)">
                  <th className="px-4 py-2.5">PO Number</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Quantity</th>
                  <th className="px-4 py-2.5">Order Date</th>
                  <th className="px-4 py-2.5">Expected Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {preview.purchaseOrders.slice(0, 5).map((po: ExtractedPurchaseOrder, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono font-medium">{po.poNumber}</td>
                    <td className="px-4 py-2.5 font-mono">{po.sku}</td>
                    <td className="px-4 py-2.5">{po.quantity.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{po.orderDate}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{po.expectedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "transactions" && (
            <table className="w-full text-left text-small">
              <thead className="bg-(--color-surface) text-(--color-text-muted) text-caption">
                <tr className="border-b border-(--color-border)">
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Warehouse</th>
                  <th className="px-4 py-2.5">Quantity</th>
                  <th className="px-4 py-2.5">Direction</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {preview.transactions.slice(0, 5).map((tx: ExtractedTransaction, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono font-medium">{tx.sku}</td>
                    <td className="px-4 py-2.5 font-mono">{tx.warehouseCode}</td>
                    <td className="px-4 py-2.5">{tx.quantity.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={tx.direction === "IN" ? "success" : "info"}>{tx.direction}</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{tx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Commit Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-(--color-border)">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={clearExisting}
            onChange={(e) => setClearExisting(e.target.checked)}
            className="h-4 w-4 rounded border-(--color-border) text-(--color-brand) focus:ring-(--color-brand)"
            disabled={isCommitting}
          />
          <span className="text-small text-(--color-text-secondary)">
            Clear & replace existing workspace data before import
          </span>
        </label>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack} disabled={isCommitting} className="gap-1.5">
            <ArrowLeft size={16} /> Back
          </Button>
          <Button
            onClick={() => onCommitImport(clearExisting)}
            disabled={isCommitting || needsBlockedDecision}
            title={needsBlockedDecision ? "Map the missing column or skip the blocked records first" : undefined}
            className="gap-2 bg-(--color-brand) text-white hover:opacity-90 px-6 py-2.5"
          >
            <Upload size={18} />
            {isCommitting ? "Importing to Database..." : "Commit & Import All Entities"}
          </Button>
        </div>
      </div>
    </div>
  );
}
