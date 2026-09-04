"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CANONICAL_FIELDS } from "@/lib/importer/mapping";
import type { SheetMapping, CanonicalFieldId, RawParsedSheet, ColumnMappingItem } from "@/lib/importer/types";
import { CheckCircle2, AlertCircle, HelpCircle, ArrowRight, ArrowLeft, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface MappingStepProps {
  sheetMappings: SheetMapping[];
  rawSheets: RawParsedSheet[];
  onUpdateMappings: (updatedMappings: SheetMapping[], remember: boolean) => void;
  onBack: () => void;
  rememberInDb: boolean;
  setRememberInDb: (val: boolean) => void;
}

export function MappingStep({
  sheetMappings,
  rawSheets,
  onUpdateMappings,
  onBack,
  rememberInDb,
  setRememberInDb,
}: MappingStepProps) {
  const [currentMappings, setCurrentMappings] = useState<SheetMapping[]>(sheetMappings);
  const [selectedSheetIdx, setSelectedSheetIdx] = useState(0);

  const activeSheet = currentMappings[selectedSheetIdx] || currentMappings[0];
  const activeRawSheet = rawSheets[selectedSheetIdx] || rawSheets[0];

  function handleFieldChange(rawHeaderIndex: number, newField: CanonicalFieldId | "ignore") {
    const updated = currentMappings.map((sheet, sIdx) => {
      if (sIdx !== selectedSheetIdx) return sheet;
      const updatedCols: ColumnMappingItem[] = sheet.mappings.map((col) => {
        if (col.rawHeaderIndex !== rawHeaderIndex) return col;
        return {
          ...col,
          canonicalField: newField === "ignore" ? null : newField,
          confidence: newField === "ignore" ? 0 : 1.0,
          matchReason: newField === "ignore" ? "Manual ignore" : "Manual selection",
        };
      });
      return { ...sheet, mappings: updatedCols };
    });
    setCurrentMappings(updated);
  }

  const allColumnsCount = currentMappings.reduce((sum, s) => sum + s.mappings.length, 0);
  const mappedColumnsCount = currentMappings.reduce(
    (sum, s) => sum + s.mappings.filter((m: ColumnMappingItem) => m.canonicalField !== null).length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-(--color-border) pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-h3 font-semibold text-(--color-text-primary)">Review Column Mappings</h2>
            <Badge tone="brand">
              {mappedColumnsCount} of {allColumnsCount} Columns Mapped
            </Badge>
          </div>
          <p className="mt-1 text-body text-(--color-text-secondary)">
            Verify how columns in your spreadsheet connect to supply chain fields. We resolved standard and regional synonyms automatically.
          </p>
        </div>
      </div>

      {/* Multi-Sheet Tabs if > 1 */}
      {currentMappings.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-(--color-border) pb-3">
          {currentMappings.map((sheet, idx) => (
            <button
              key={sheet.sheetName}
              onClick={() => setSelectedSheetIdx(idx)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-caption font-medium transition-colors flex items-center gap-2",
                idx === selectedSheetIdx
                  ? "bg-(--color-brand) text-white"
                  : "bg-(--color-surface-secondary) text-(--color-text-secondary) hover:text-(--color-text-primary)"
              )}
            >
              <span>Sheet: {sheet.sheetName}</span>
              <span className="opacity-80">({sheet.mappings.length} cols)</span>
            </button>
          ))}
        </div>
      )}

      {/* Mapping Table */}
      <Card className="overflow-hidden border border-(--color-border) bg-(--color-surface)">
        <div className="p-4 bg-(--color-surface-secondary) border-b border-(--color-border) flex items-center justify-between">
          <span className="font-semibold text-small text-(--color-text-primary)">
            Sheet &quot;{activeSheet?.sheetName}&quot; (Header detected at row {(activeSheet?.headerRowIndex ?? 0) + 1})
          </span>
          <span className="text-caption text-(--color-text-muted)">
            {activeRawSheet?.rawRows?.length ?? 0} data rows found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-small">
            <thead>
              <tr className="border-b border-(--color-border) bg-(--color-surface) text-(--color-text-muted) text-caption font-medium">
                <th className="px-4 py-3">Source Header (Excel)</th>
                <th className="px-4 py-3">Sample Value</th>
                <th className="px-4 py-3">Mapped Supply Chain Field</th>
                <th className="px-4 py-3">Confidence & Match Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-border)">
              {activeSheet?.mappings.map((col: ColumnMappingItem) => {
                const sampleVal =
                  activeRawSheet?.rawRows?.[0]?.[col.rawHeaderIndex] ??
                  activeRawSheet?.rawRows?.[1]?.[col.rawHeaderIndex] ??
                  "—";

                return (
                  <tr key={col.rawHeaderIndex} className="hover:bg-(--color-surface-secondary)/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-(--color-text-primary)">
                      {col.rawHeader}
                    </td>
                    <td className="px-4 py-3 text-(--color-text-secondary) font-mono text-xs max-w-[180px] truncate">
                      {String(sampleVal)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={col.canonicalField || "ignore"}
                        onChange={(e) =>
                          handleFieldChange(col.rawHeaderIndex, e.target.value as CanonicalFieldId | "ignore")
                        }
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-small text-(--color-text-primary) font-medium focus:border-(--color-brand) focus:outline-none"
                      >
                        <option value="ignore">— Ignore this column —</option>
                        {CANONICAL_FIELDS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {col.canonicalField === null ? (
                        <Badge tone="neutral">Ignored Column</Badge>
                      ) : col.confidence >= 0.95 ? (
                        <Badge tone="success" className="gap-1">
                          <CheckCircle2 size={12} /> {col.matchReason || "Exact / Synonym"}
                        </Badge>
                      ) : col.confidence >= 0.60 ? (
                        <Badge tone="warning" className="gap-1">
                          <AlertCircle size={12} /> {col.matchReason || `Fuzzy (${Math.round(col.confidence * 100)}%)`}
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="gap-1">
                          <HelpCircle size={12} /> {col.matchReason || "Manual"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mapping Persistence & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-(--color-border)">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberInDb}
            onChange={(e) => setRememberInDb(e.target.checked)}
            className="h-4 w-4 rounded border-(--color-border) text-(--color-brand) focus:ring-(--color-brand)"
          />
          <span className="text-small text-(--color-text-secondary) flex items-center gap-1.5">
            <Bookmark size={14} className="text-(--color-brand)" />
            Save this column layout to workspace memory (I2 DB memory)
          </span>
        </label>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack} className="gap-1.5">
            <ArrowLeft size={16} /> Back
          </Button>
          <Button
            onClick={() => onUpdateMappings(currentMappings, rememberInDb)}
            className="gap-1.5 bg-(--color-brand) text-white hover:opacity-90"
          >
            Confirm & Proceed <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
