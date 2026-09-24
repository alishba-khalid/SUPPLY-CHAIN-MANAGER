"use client";

import { AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TemplateRejectedRow } from "@/lib/importer/template-rows";

const SHOWN = 5;

/**
 * Rows the template importer refused because a required value was blank or
 * invalid. Nothing was written for them; the CSV lists every one as
 * "Row N, column X: reason".
 */
export function RejectedRowsNotice({ rows, fileLabel }: { rows: TemplateRejectedRow[]; fileLabel: string }) {
  if (rows.length === 0) return null;

  function download() {
    const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = ["Row,Reason", ...rows.map((r) => `${r.row},${quote(r.reason)}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rejected_${fileLabel.toLowerCase().replace(/\s+/g, "_")}_rows.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-small text-red-600 dark:text-red-400">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            <strong>{rows.length.toLocaleString()} rows rejected</strong> — a required value was blank or invalid, so nothing was
            written for them (no value is ever filled in for you).
          </span>
        </span>
        <Button variant="secondary" size="sm" onClick={download} className="gap-1.5 shrink-0">
          <Download size={14} /> Download rejected rows CSV
        </Button>
      </div>
      <ul className="list-disc pl-6 text-caption">
        {rows.slice(0, SHOWN).map((r) => (
          <li key={r.row}>{r.reason}</li>
        ))}
        {rows.length > SHOWN && <li>…and {(rows.length - SHOWN).toLocaleString()} more in the CSV.</li>}
      </ul>
    </div>
  );
}
