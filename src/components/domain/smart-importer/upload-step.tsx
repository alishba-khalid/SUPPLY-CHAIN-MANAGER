"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, Download, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RawParsedSheet } from "@/lib/importer/types";

interface UploadStepProps {
  onFileLoaded: (file: File, sheets: RawParsedSheet[]) => void;
  onSwitchToLegacy: () => void;
  isProcessing: boolean;
}

export function UploadStep({ onFileLoaded, onSwitchToLegacy, isProcessing }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);

  async function handleFile(file: File) {
    if (!file) return;
    const { readWorkbookBuffer } = await import("@/lib/importer/reader");
    const arrayBuffer = await file.arrayBuffer();
    const sheets = readWorkbookBuffer(arrayBuffer);
    onFileLoaded(file, sheets);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }

  function downloadSampleMessyWorkbook() {
    import("@/../fixtures/generate-messy-fixture").then(({ createMessyWorkbookBuffer }) => {
      const buffer = createMessyWorkbookBuffer();
      const uint8 = new Uint8Array(buffer);
      const blob = new Blob([uint8], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "messy_supply_chain_demo.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-(--color-border) pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-h3 font-semibold text-(--color-text-primary)">Smart Data Importer</h2>
            <Badge tone="brand" className="gap-1">
              <Sparkles size={12} /> Auto-Detect
            </Badge>
          </div>
          <p className="mt-1 text-body text-(--color-text-secondary)">
            Drag and drop any messy spreadsheet. We automatically detect title rows, map headers, merge vendor abbreviations, and extract all supply chain entities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={downloadSampleMessyWorkbook}
            className="flex items-center gap-1.5 text-caption font-medium"
          >
            <Download size={14} />
            Download Messy Demo File
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSwitchToLegacy}
            className="text-caption text-(--color-text-secondary) hover:text-(--color-text-primary)"
          >
            Switch to 6-File Template Mode
          </Button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("smart-file-upload")?.click()}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all",
          isDragging
            ? "border-(--color-brand) bg-(--color-brand)/5 scale-[1.005]"
            : "border-(--color-border) hover:border-(--color-brand)/50 bg-(--color-surface)"
        )}
      >
        <input
          id="smart-file-upload"
          type="file"
          accept=".xlsx,.xlsm,.xls,.csv,.tsv"
          onChange={handleSelect}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="rounded-2xl bg-(--color-brand)/10 p-4 text-(--color-brand) mb-4">
          <UploadCloud size={36} />
        </div>

        <h3 className="text-body font-semibold text-(--color-text-primary)">
          {isProcessing ? "Analyzing workbook..." : "Drag & drop your Excel or CSV file here"}
        </h3>
        <p className="mt-1 text-caption text-(--color-text-muted) max-w-md">
          Supports <code className="font-mono text-xs">.xlsx</code>, <code className="font-mono text-xs">.xlsm</code>, <code className="font-mono text-xs">.csv</code>, <code className="font-mono text-xs">.tsv</code>. Multi-sheet workbooks and wide tables supported.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-caption text-(--color-text-secondary)">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" /> Title row & header detection
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" /> Fuzzy supplier deduplication
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" /> Currency & serial date cleaning
          </span>
        </div>

        <div className="mt-4 rounded-full bg-(--color-surface-secondary) border border-(--color-border) px-3.5 py-1 text-xs text-(--color-text-secondary)">
          Demo instance limited to 5,000 rows per import. Self-hosted has no limit.
        </div>
      </div>
    </div>
  );
}
