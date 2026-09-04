"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitMerge, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft, Building2, Package } from "lucide-react";
import type { FuzzyMergeGroup, SkuSupplierConflict } from "@/lib/importer/types";

interface MergesStepProps {
  mergeGroups: FuzzyMergeGroup[];
  skuConflicts: SkuSupplierConflict[];
  onConfirmMerges: (
    updatedMergeGroups: FuzzyMergeGroup[],
    resolvedConflicts: Record<string, string> // sku -> selectedSupplier
  ) => void;
  onBack: () => void;
}

export function MergesStep({
  mergeGroups,
  skuConflicts,
  onConfirmMerges,
  onBack,
}: MergesStepProps) {
  // State for which merge groups are enabled
  const [currentMergeGroups, setCurrentMergeGroups] = useState<FuzzyMergeGroup[]>(mergeGroups);

  // State for resolved SKU conflicts
  const [skuResolutions, setSkuResolutions] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    skuConflicts.forEach((c) => {
      init[c.sku] = c.selectedSupplier || c.suppliers[0];
    });
    return init;
  });

  function toggleMerge(groupId: string) {
    setCurrentMergeGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, isConfirmed: !g.isConfirmed } : g))
    );
  }

  function handleSupplierChoice(sku: string, supplier: string) {
    setSkuResolutions((prev) => ({
      ...prev,
      [sku]: supplier,
    }));
  }

  function handleContinue() {
    onConfirmMerges(currentMergeGroups, skuResolutions);
  }

  const hasMerges = currentMergeGroups.length > 0;
  const hasConflicts = skuConflicts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-(--color-border) pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-h3 font-semibold text-(--color-text-primary)">Entity Deduplication & Conflicts</h2>
            {(hasMerges || hasConflicts) && (
              <Badge tone="brand">
                {currentMergeGroups.length} Merge Candidates · {skuConflicts.length} SKU Conflicts
              </Badge>
            )}
          </div>
          <p className="mt-1 text-body text-(--color-text-secondary)">
            We detected vendor abbreviations and catalog variations. Review candidates to ensure clean data before extraction.
          </p>
        </div>
      </div>

      {/* Fuzzy Merges Section */}
      {hasMerges && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-small font-semibold text-(--color-text-primary)">
            <Building2 size={16} className="text-(--color-brand)" />
            <span>Supplier Name Merges (I1 Token-Prefix & Fuzzy Clustering)</span>
          </div>

          <div className="grid gap-4">
            {currentMergeGroups.map((group) => {
              const isEnabled = group.isConfirmed;
              return (
                <Card
                  key={group.id}
                  className={`p-5 transition-all border ${
                    isEnabled
                      ? "border-(--color-brand)/40 bg-(--color-surface)"
                      : "border-(--color-border) bg-(--color-surface-secondary)/50 opacity-60"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-body text-(--color-text-primary)">
                          {group.canonicalName}
                        </span>
                        <Badge tone="success">Canonical Target</Badge>
                      </div>
                      <p className="text-caption text-(--color-text-muted)">
                        Found {group.variants.length} variations across your spreadsheet
                      </p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleMerge(group.id)}
                        className="h-4 w-4 rounded border-(--color-border) text-(--color-brand) focus:ring-(--color-brand)"
                      />
                      <span className="text-small font-medium text-(--color-text-primary)">
                        {isEnabled ? "Merge into one supplier" : "Keep as separate suppliers"}
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-(--color-border)">
                    <span className="text-caption text-(--color-text-muted) uppercase font-medium self-center">
                      Variations detected:
                    </span>
                    {group.variants.map((v) => (
                      <span
                        key={v.originalName}
                        className="inline-flex items-center gap-1.5 rounded-md bg-(--color-surface-secondary) px-2.5 py-1 text-caption font-mono text-(--color-text-secondary)"
                      >
                        <GitMerge size={12} className="text-(--color-brand)" />
                        {v.originalName} ({v.rowCount} rows)
                      </span>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* SKU Conflict Resolution Section (I5.1) */}
      {hasConflicts && (
        <div className="space-y-4 pt-4 border-t border-(--color-border)">
          <div className="flex items-center gap-2 text-small font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle size={16} />
            <span>SKU Supplier Conflicts (I5.1 Resolution Required)</span>
          </div>
          <p className="text-caption text-(--color-text-secondary)">
            These SKUs appear with multiple distinct supplier names. Please choose the primary supplier:
          </p>

          <div className="grid gap-4">
            {skuConflicts.map((c) => (
              <Card key={c.sku} className="p-5 border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Package size={16} className="text-amber-600" />
                  <span className="font-semibold text-body text-(--color-text-primary)">{c.sku}</span>
                  <span className="text-caption text-(--color-text-muted)">({c.productName})</span>
                </div>

                <div className="space-y-2">
                  <p className="text-caption font-medium text-(--color-text-muted) uppercase">
                    Select Primary Supplier:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {c.suppliers.map((s) => (
                      <label
                        key={s}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                          skuResolutions[c.sku] === s
                            ? "border-(--color-brand) bg-(--color-brand)/10 text-(--color-brand) font-semibold"
                            : "border-(--color-border) bg-(--color-surface) text-(--color-text-secondary)"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`sku-supp-${c.sku}`}
                          value={s}
                          checked={skuResolutions[c.sku] === s}
                          onChange={() => handleSupplierChoice(c.sku, s)}
                          className="text-(--color-brand) focus:ring-(--color-brand)"
                        />
                        <span className="text-small">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* If Clean File (no merges & no conflicts) */}
      {!hasMerges && !hasConflicts && (
        <Card className="p-8 text-center space-y-3">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <h4 className="font-semibold text-body text-(--color-text-primary)">
            Clean Data — No Duplicates or Conflicts Found
          </h4>
          <p className="text-small text-(--color-text-muted) max-w-md mx-auto">
            All vendor names and SKU references are consistent throughout the spreadsheet.
          </p>
        </Card>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-(--color-border)">
        <Button variant="secondary" onClick={onBack} className="gap-1.5">
          <ArrowLeft size={16} /> Back to Mapping
        </Button>
        <Button
          onClick={handleContinue}
          className="gap-1.5 bg-(--color-brand) text-white hover:opacity-90"
        >
          Continue to Extraction Preview <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
