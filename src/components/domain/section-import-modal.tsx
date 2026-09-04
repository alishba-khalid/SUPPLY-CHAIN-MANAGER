"use client";

import { useState, useTransition, useMemo } from "react";
import * as XLSX from "xlsx";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { importDataAction } from "@/app/actions/import";
import { Download, Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

type ImportType =
  | "warehouses"
  | "suppliers"
  | "products"
  | "inventory"
  | "purchase_orders"
  | "transactions";

const IMPORT_CONFIGS: Record<
  ImportType,
  { label: string; requiredHeaders: string[]; templateCsv: string; description: string }
> = {
  warehouses: {
    label: "Warehouses",
    requiredHeaders: ["Warehouse Code", "Name"],
    templateCsv: "Warehouse Code,Name,Capacity (Units)\nNDC,National Distribution Center,50000\nWH-WEST,West Coast Facility,25000",
    description: "Locations where inventory is stored. Establishes capacity metrics.",
  },
  suppliers: {
    label: "Suppliers",
    requiredHeaders: ["Supplier ID", "Name"],
    templateCsv: "Supplier ID,Name,Lead Time (Days),Email\nSUP-001,Delta Components LLC,14,orders@deltacomponents.com\nSUP-002,Northgate Industrial,10,supply@northgate.com",
    description: "Vendors supplying products. Sets lead time expectations.",
  },
  products: {
    label: "Products",
    requiredHeaders: ["SKU", "Name", "Supplier ID"],
    templateCsv: "SKU,Name,Category,Unit Cost,Supplier ID\nSKU-1001,Hydraulic Valve Assembly,valves,45.50,SUP-001\nSKU-1002,Stainless Steel Gasket,fasteners,3.20,SUP-002",
    description: "Catalog item master list. Relates products to their default supplier.",
  },
  inventory: {
    label: "Inventory Balances",
    requiredHeaders: ["SKU", "Warehouse Code", "Quantity On Hand"],
    templateCsv: "SKU,Warehouse Code,Quantity On Hand\nSKU-1001,NDC,1250\nSKU-1002,NDC,5000",
    description: "Current on-hand stock quantities by SKU and Warehouse.",
  },
  purchase_orders: {
    label: "Purchase Orders",
    requiredHeaders: ["PO Number", "Supplier ID", "SKU", "Quantity", "Unit Price", "Order Date", "Expected Date"],
    templateCsv: "PO Number,Supplier ID,SKU,Quantity,Unit Price,Order Date,Expected Date,Received Date\nPO-8001,SUP-001,SKU-1001,500,45.50,2026-08-01,2026-08-15,2026-08-14\nPO-8002,SUP-002,SKU-1002,2000,3.20,2026-08-20,2026-08-30,",
    description: "Inbound supply orders. Used for cycle time and supplier reliability calculations.",
  },
  transactions: {
    label: "Inventory Transactions",
    requiredHeaders: ["SKU", "Warehouse Code", "Quantity", "Direction", "Date"],
    templateCsv: "SKU,Warehouse Code,Quantity,Direction,Date\nSKU-1001,NDC,500,IN,2026-08-14\nSKU-1001,NDC,25,OUT,2026-08-15",
    description: "Inbound and outbound movements (IN/OUT). Establishes daily demand velocity.",
  },
};

export function SectionImportModal({
  open,
  onClose,
  type,
}: {
  open: boolean;
  onClose: () => void;
  type: ImportType;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);

  const config = IMPORT_CONFIGS[type];

  function resetState() {
    setFile(null);
    setParsedRows([]);
    setValidationError(null);
    setImportResult(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function downloadTemplate() {
    const blob = new Blob([config.templateCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `template_${type}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function processFile(selectedFile: File) {
    setFile(selectedFile);
    setValidationError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        if (rows.length === 0) {
          setValidationError("The uploaded file is empty.");
          return;
        }

        const headers = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] || [];
        const cleanHeaders = headers.map((h) => String(h).trim());

        const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-()]/g, "");
        const cleanHeadersNorm = cleanHeaders.map(normalize);
        const missingHeaders = config.requiredHeaders.filter(
          (required) => !cleanHeadersNorm.includes(normalize(required))
        );

        if (missingHeaders.length > 0) {
          setValidationError(
            `Missing required columns: ${missingHeaders.join(", ")}. Please follow the template layout.`
          );
          return;
        }

        setParsedRows(rows);
      } catch (err) {
        setValidationError("Failed to read file. Please ensure it is a valid Excel or CSV file.");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }

  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  async function handleImport() {
    if (parsedRows.length === 0) return;

    startTransition(async () => {
      try {
        const BATCH_SIZE = 500;
        let totalCount = 0;

        for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
          const batch = parsedRows.slice(i, i + BATCH_SIZE);
          const isFirstBatch = i === 0;

          if (parsedRows.length > BATCH_SIZE) {
            setProgressMsg(
              `Saving rows ${i + 1} to ${Math.min(i + BATCH_SIZE, parsedRows.length)} of ${parsedRows.length}...`
            );
          }

          const res = await importDataAction(type, batch, {
            clearExisting: isFirstBatch ? clearExisting : false,
          });

          if (!res.success) {
            setImportResult({
              success: false,
              message: "error" in res ? res.error : "Import failed",
            });
            setProgressMsg(null);
            return;
          }

          if ("count" in res && typeof res.count === "number") {
            totalCount += res.count;
          }
        }

        setImportResult({
          success: true,
          message: `Successfully saved ${totalCount} records into ${config.label}!`,
        });
        setParsedRows([]);
        setFile(null);
      } catch (err) {
        setImportResult({
          success: false,
          message: err instanceof Error ? err.message : "An unexpected error occurred during import.",
        });
      } finally {
        setProgressMsg(null);
      }
    });
  }

  const previewHeaders = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return Object.keys(parsedRows[0]).slice(0, 6);
  }, [parsedRows]);

  return (
    <Modal open={open} onClose={handleClose} title={`Import ${config.label}`} className="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-(--color-surface-secondary) p-3 text-small">
          <span className="text-(--color-text-secondary)">{config.description}</span>
          <Button variant="ghost" size="sm" onClick={downloadTemplate} className="shrink-0 gap-1.5 text-caption">
            <Download size={14} />
            Template CSV
          </Button>
        </div>

        {/* Upload Box */}
        {!file && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
            }}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-(--color-brand) bg-(--color-surface-secondary)"
                : "border-(--color-border) hover:border-(--color-text-muted) bg-(--color-surface)"
            )}
            onClick={() => document.getElementById(`file-upload-${type}`)?.click()}
          >
            <input
              id={`file-upload-${type}`}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files?.[0]) processFile(e.target.files[0]);
              }}
              className="hidden"
            />
            <Upload size={28} className="text-(--color-text-muted) mb-2" />
            <p className="text-body font-medium text-(--color-text-primary)">
              Drop {config.label} spreadsheet here, or <span className="text-(--color-brand) underline">browse</span>
            </p>
            <p className="mt-1 text-caption text-(--color-text-muted)">Supports CSV and Excel (.xlsx, .xls)</p>
          </div>
        )}

        {/* Loaded File Info */}
        {file && (
          <div className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-surface) p-3">
            <div className="flex items-center gap-3">
              <div className="rounded bg-emerald-500/10 p-2 text-emerald-500">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <p className="text-small font-medium text-(--color-text-primary)">{file.name}</p>
                <p className="text-caption text-(--color-text-muted)">
                  {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} rows ready
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={resetState} disabled={isPending}>
              Change
            </Button>
          </div>
        )}

        {/* Validation or Result Alert Messages */}
        {validationError && (
          <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-small text-red-500">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>{validationError}</div>
          </div>
        )}

        {importResult && (
          <div
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg border p-3 text-small",
              importResult.success
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                : "border-red-500/20 bg-red-500/10 text-red-500"
            )}
          >
            <div className="flex items-center gap-2">
              {importResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span className="font-medium">{importResult.message}</span>
            </div>
            {importResult.success && (
              <Button size="sm" onClick={handleClose}>
                Done
              </Button>
            )}
          </div>
        )}

        {/* Preview */}
        {parsedRows.length > 0 && !validationError && !importResult?.success && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-(--color-text-muted) uppercase">Preview (First 5 Rows)</span>
              <Badge tone="success">{parsedRows.length} Rows</Badge>
            </div>
            <div className="max-h-48 overflow-auto rounded-lg border border-(--color-border)">
              <table className="w-full text-caption">
                <thead>
                  <tr className="border-b border-(--color-border) bg-(--color-surface-secondary)">
                    {previewHeaders.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-(--color-text-muted)">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-(--color-border) last:border-b-0">
                      {previewHeaders.map((h) => (
                        <td key={h} className="px-3 py-1.5 text-(--color-text-secondary)">
                          {String(row[h] !== undefined ? row[h] : "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-caption text-(--color-text-secondary)">
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="rounded border-(--color-border)"
                  disabled={isPending}
                />
                Clear existing {config.label.toLowerCase()} before import
              </label>

              <Button onClick={handleImport} disabled={isPending} className="gap-1.5">
                {isPending ? "Saving..." : "Save to Database"}
              </Button>
            </div>
          </div>
        )}

        {isPending && <LoadingState message={progressMsg || "Writing records to database..."} />}
      </div>
    </Modal>
  );
}
