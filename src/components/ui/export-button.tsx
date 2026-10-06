"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** One spreadsheet column: header text and how to read it from a row. */
export interface ExportColumn<T> {
  header: string;
  /** null/undefined is written as an empty cell — never as 0 or "N/A". */
  value: (row: T) => string | number | null | undefined;
}

/** "inventory" → "inventory-2026-10-06.xlsx" (the visitor's local date). */
function fileName(base: string): string {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${base}-${day}.xlsx`;
}

export async function downloadXlsx<T>(base: string, sheetName: string, columns: ExportColumn<T>[], rows: T[]) {
  // Loaded on click so the spreadsheet library isn't in every page's bundle.
  const XLSX = await import("xlsx");
  const aoa = [
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => c.value(row) ?? "")),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = columns.map((c) => ({ wch: Math.max(10, c.header.length + 2) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(book, fileName(base));
}

/**
 * Exports the rows the table is showing (after its search and filters).
 * Pass `loadRows` instead of `rows` when the table is paginated on the
 * server and the export needs every matching row, not just this page.
 */
export function ExportButton<T>({
  fileBase,
  sheetName,
  columns,
  rows,
  loadRows,
}: {
  fileBase: string;
  sheetName: string;
  columns: ExportColumn<T>[];
  rows?: T[];
  loadRows?: () => Promise<T[]>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = !loadRows && (rows?.length ?? 0) === 0;

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const data = loadRows ? await loadRows() : (rows ?? []);
      await downloadXlsx(fileBase, sheetName, columns, data);
    } catch (err) {
      console.error("[export] failed:", err);
      setError("Export failed — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleClick}
        disabled={busy || empty}
        className="gap-1.5"
        title={empty ? "Nothing to export" : "Download these rows as an Excel file"}
      >
        <Download size={14} />
        {busy ? "Exporting…" : "Export to Excel"}
      </Button>
      {error && <span className="text-caption text-red-500">{error}</span>}
    </div>
  );
}
