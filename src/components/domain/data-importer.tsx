"use client";

import { useState, useTransition, useMemo } from "react";
import * as XLSX from "xlsx";
import { importDataAction } from "@/app/actions/import";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { Download, Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

type ImportType =
  | "warehouses"
  | "suppliers"
  | "products"
  | "inventory"
  | "purchase_orders"
  | "transactions";

interface ImportConfig {
  label: string;
  requiredHeaders: string[];
  templateCsv: string;
  description: string;
}

const IMPORT_CONFIGS: Record<ImportType, ImportConfig> = {
  warehouses: {
    label: "Warehouses",
    requiredHeaders: ["Warehouse Code", "Name"],
    templateCsv: "Warehouse Code,Name,Capacity (Units)\nNDC,National Distribution Center,50000\nW1,Secondary Warehouse,20000",
    description: "Locations where inventory is stored. Establishes capacity metrics.",
  },
  suppliers: {
    label: "Suppliers",
    requiredHeaders: ["Supplier ID", "Name"],
    templateCsv: "Supplier ID,Name,Lead Time (Days),Email\nSUP-001,Delta Components,14,delta@example.com\nSUP-002,Northgate Materials,10,north@example.com",
    description: "Vendors supplying products. Sets lead time expectations.",
  },
  products: {
    label: "Products",
    requiredHeaders: ["SKU", "Name", "Supplier ID"],
    templateCsv: "SKU,Name,Category,Unit Cost,Supplier ID\nSKU-001,Actuator Arm,component,12.50,SUP-001\nSKU-002,Standard Gasket,mro,2.10,SUP-002",
    description: "Catalog item master list. Relates products to their default supplier.",
  },
  inventory: {
    label: "Inventory Balances",
    requiredHeaders: ["SKU", "Warehouse Code", "Quantity On Hand"],
    templateCsv: "SKU,Warehouse Code,Quantity On Hand\nSKU-001,NDC,1500\nSKU-002,W1,5000",
    description: "Current on-hand stock quantities by SKU and Warehouse.",
  },
  purchase_orders: {
    label: "Purchase Orders",
    requiredHeaders: ["PO Number", "Supplier ID", "SKU", "Quantity", "Unit Price", "Order Date", "Expected Date"],
    templateCsv: "PO Number,Supplier ID,SKU,Quantity,Unit Price,Order Date,Expected Date,Received Date\nPO-1001,SUP-001,SKU-001,500,12.50,2026-08-01,2026-08-15,2026-08-14\nPO-1002,SUP-002,SKU-002,1000,2.10,2026-08-10,2026-08-20,",
    description: "Inbound supply orders. Used for cycle time and supplier reliability score calculations.",
  },
  transactions: {
    label: "Inventory Transactions",
    requiredHeaders: ["SKU", "Warehouse Code", "Quantity", "Direction", "Date"],
    templateCsv: "SKU,Warehouse Code,Quantity,Direction,Date\nSKU-001,NDC,150,IN,2026-08-14\nSKU-001,NDC,12,OUT,2026-08-15\nSKU-002,W1,50,OUT,2026-08-16",
    description: "Inbound and outbound movements (IN/OUT). Establishes daily demand trends.",
  },
};

export function DataImporter() {
  const [importType, setImportType] = useState<ImportType>("warehouses");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);

  const config = IMPORT_CONFIGS[importType];

  function resetState() {
    setFile(null);
    setParsedRows([]);
    setValidationError(null);
    setImportResult(null);
  }

  function handleTypeChange(type: ImportType) {
    setImportType(type);
    resetState();
  }

  // Generate and download a sample CSV file
  function downloadTemplate() {
    const blob = new Blob([config.templateCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `scm_template_${importType}.csv`);
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

        // Read sheet as JSON
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        if (rows.length === 0) {
          setValidationError("The uploaded file is empty.");
          return;
        }

        // Get headers from sheet
        const headers = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] || [];
        const cleanHeaders = headers.map((h) => String(h).trim());

        // Check for required headers with normalized comparison (ignoring case, spaces, symbols)
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

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }

  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  function handleImport() {
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

          const res = await importDataAction(importType, batch, {
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
          message: `Successfully saved and imported ${totalCount} records into ${config.label}!`,
        });
        setParsedRows([]);
        setFile(null);
      } catch (err) {
        setImportResult({
          success: false,
          message: err instanceof Error ? err.message : "Unknown error occurred",
        });
      } finally {
        setProgressMsg(null);
      }
    });
  }

  // Preview table columns mapping
  const previewHeaders = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return Object.keys(parsedRows[0]).slice(0, 8); // show up to 8 columns in preview
  }, [parsedRows]);

  const domainUrlMap: Record<ImportType, { label: string; href: string }> = {
    warehouses: { label: "Warehouses Page", href: "/dashboard/warehouses" },
    suppliers: { label: "Suppliers Page", href: "/dashboard/suppliers" },
    products: { label: "Inventory Page", href: "/dashboard/inventory" },
    inventory: { label: "Inventory Page", href: "/dashboard/inventory" },
    purchase_orders: { label: "Procurement Page", href: "/dashboard/procurement" },
    transactions: { label: "Inventory Trends", href: "/dashboard/inventory" },
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-(--color-border) pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-h3 font-semibold text-(--color-text-primary)">Excel & CSV Importer</h2>
          <p className="mt-1 text-body text-(--color-text-secondary)">
            Import your operational logs directly into the supply chain databases.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={importType}
            onChange={(e) => handleTypeChange(e.target.value as ImportType)}
            className="h-9 rounded-md border border-(--color-border) bg-(--color-surface) px-3 text-body text-(--color-text-primary)"
            disabled={isPending}
          >
            {Object.entries(IMPORT_CONFIGS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={downloadTemplate} className="flex items-center gap-1.5">
            <Download size={14} />
            Download Template
          </Button>
        </div>
      </div>

      {/* Description & Requirements Box */}
      <Card className="bg-(--color-surface-secondary) p-5">
        <h4 className="font-semibold text-(--color-text-primary)">About {config.label} Import</h4>
        <p className="mt-1 text-small text-(--color-text-secondary)">{config.description}</p>
        <div className="mt-3.5 flex flex-wrap gap-2 items-center text-caption">
          <span className="font-medium text-(--color-text-muted) uppercase">Required columns:</span>
          {config.requiredHeaders.map((header) => (
            <Badge key={header} tone="neutral">
              {header}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Drag & Drop Upload Zone */}
      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-(--color-brand) bg-(--color-surface-secondary)"
              : "border-(--color-border) hover:border-(--color-text-muted) bg-(--color-surface)"
          )}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload size={32} className="text-(--color-text-muted) mb-3" />
          <p className="text-body font-medium text-(--color-text-primary)">
            Drag and drop your spreadsheet here, or <span className="text-(--color-brand) underline font-semibold">browse files</span>
          </p>
          <p className="mt-1 text-caption text-(--color-text-muted)">
            Supports Excel (.xlsx, .xls) and CSV files
          </p>
        </div>
      )}

      {/* Loaded File Info */}
      {file && (
        <div className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-surface) p-4">
          <div className="flex items-center gap-3">
            <div className="rounded bg-emerald-500/10 p-2 text-emerald-500">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p className="text-body font-medium text-(--color-text-primary)">{file.name}</p>
              <p className="text-caption text-(--color-text-muted)">
                {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} rows ready to save
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={resetState} disabled={isPending}>
            Remove File
          </Button>
        </div>
      )}

      {/* Validation or Result Alert Messages */}
      {validationError && (
        <div className="flex gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-small text-red-500">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>{validationError}</div>
        </div>
      )}

      {importResult && (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-lg border p-4 text-small sm:flex-row sm:items-center sm:justify-between",
            importResult.success
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
              : "border-red-500/20 bg-red-500/10 text-red-500"
          )}
        >
          <div className="flex items-center gap-2.5">
            {importResult.success ? (
              <CheckCircle2 size={18} className="shrink-0" />
            ) : (
              <AlertCircle size={18} className="shrink-0" />
            )}
            <span className="font-medium">{importResult.message}</span>
          </div>

          {importResult.success && (
            <a
              href={domainUrlMap[importType].href}
              className="inline-flex items-center gap-1 rounded bg-(--color-brand) px-3 py-1.5 text-caption font-semibold text-white hover:opacity-90 transition-opacity"
            >
              View in {domainUrlMap[importType].label} →
            </a>
          )}
        </div>
      )}

      {/* Data Preview Table */}
      {parsedRows.length > 0 && !validationError && (
        <div className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-(--color-text-primary) text-small">
              Data Preview ({parsedRows.length} total rows detected — showing first 5)
            </h4>
            <Badge tone="success">{parsedRows.length} Valid Rows</Badge>
          </div>

          <div className="overflow-x-auto rounded-lg border border-(--color-border)">
            <table className="w-full min-w-max border-collapse text-body text-small">
              <thead>
                <tr className="border-b border-(--color-border) bg-(--color-surface-secondary)">
                  {previewHeaders.map((header) => (
                    <th key={header} className="px-4 py-2.5 text-left font-medium text-(--color-text-muted) uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="border-b border-(--color-border) last:border-b-0">
                    {previewHeaders.map((header) => {
                      const val = row[header];
                      let displayVal = "—";
                      if (val !== undefined && val !== null && val !== "") {
                        if (val instanceof Date) {
                          displayVal = val.toISOString().slice(0, 10);
                        } else if (typeof val === "number" && val > 20000 && val < 70000 && /date/i.test(header)) {
                          const d = new Date(Math.round((val - 25569) * 86400 * 1000));
                          displayVal = isNaN(d.getTime()) ? String(val) : d.toISOString().slice(0, 10);
                        } else {
                          displayVal = String(val);
                        }
                      }
                      return (
                        <td key={header} className="px-4 py-2.5 text-(--color-text-secondary)">
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import / Save Action Controls */}
          <div className="flex flex-col gap-4 border-t border-(--color-border) pt-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="h-4 w-4 rounded border-(--color-border) text-(--color-brand) focus:ring-(--color-brand)"
                disabled={isPending}
              />
              <span className="text-small text-(--color-text-secondary)">
                Clear & replace existing {config.label.toLowerCase()} in database
              </span>
            </label>
            <Button onClick={handleImport} disabled={isPending} size="lg" className="flex items-center gap-2">
              {isPending ? (
                <>Saving data to database...</>
              ) : (
                <>
                  <Upload size={18} />
                  Save Data to Database
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {isPending && (
        <div className="py-4">
          <LoadingState message={progressMsg || "Saving records into PostgreSQL database..."} />
        </div>
      )}
    </div>
  );
}
