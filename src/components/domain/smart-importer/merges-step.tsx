"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitMerge, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft, Building2, Package } from "lucide-react";
import type {
  DuplicateStockPosition,
  FuzzyMergeGroup,
  ProductDetailConflict,
  SkuDuplicateResolution,
  SkuSupplierConflict,
} from "@/lib/importer/types";

// Long lists stay usable; anything not shown keeps its default choice.
const MAX_LISTED = 100;

const FIELD_LABELS: Record<ProductDetailConflict["field"], string> = {
  name: "Product name",
  category: "Category",
  unitCost: "Unit cost",
};

export interface MergeDecisions {
  mergeGroups: FuzzyMergeGroup[];
  skuSupplierResolutions: Record<string, string>; // sku -> supplier ID
  productConflictResolutions: Record<string, number>; // "sku|field" -> option index
  skuDuplicateResolution: SkuDuplicateResolution;
}

interface MergesStepProps {
  mergeGroups: FuzzyMergeGroup[];
  skuConflicts: SkuSupplierConflict[];
  productConflicts: ProductDetailConflict[];
  duplicateStockPositions: DuplicateStockPosition[];
  skuDuplicateResolution: SkuDuplicateResolution;
  onConfirmMerges: (decisions: MergeDecisions) => void;
  onBack: () => void;
}

export function MergesStep({
  mergeGroups,
  skuConflicts,
  productConflicts,
  duplicateStockPositions,
  skuDuplicateResolution,
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

  const [productResolutions, setProductResolutions] = useState<Record<string, number>>(() =>
    Object.fromEntries(productConflicts.map((c) => [`${c.sku}|${c.field}`, c.selectedIndex]))
  );
  const [duplicateResolution, setDuplicateResolution] = useState<SkuDuplicateResolution>(skuDuplicateResolution);

  function handleSupplierChoice(sku: string, supplier: string) {
    setSkuResolutions((prev) => ({
      ...prev,
      [sku]: supplier,
    }));
  }

  function handleContinue() {
    onConfirmMerges({
      mergeGroups: currentMergeGroups,
      skuSupplierResolutions: skuResolutions,
      productConflictResolutions: productResolutions,
      skuDuplicateResolution: duplicateResolution,
    });
  }

  const hasMerges = currentMergeGroups.length > 0;
  const hasConflicts = skuConflicts.length > 0;
  const hasProductConflicts = productConflicts.length > 0;
  const hasDuplicates = duplicateStockPositions.length > 0;
  const nothingToReview = !hasMerges && !hasConflicts && !hasProductConflicts && !hasDuplicates;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-(--color-border) pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-h3 font-semibold text-(--color-text-primary)">Entity Deduplication & Conflicts</h2>
            {!nothingToReview && (
              <Badge tone="brand">
                {currentMergeGroups.length} Merges · {skuConflicts.length + productConflicts.length} Conflicts ·{" "}
                {duplicateStockPositions.length} Duplicate Stock Rows
              </Badge>
            )}
          </div>
          <p className="mt-1 text-body text-(--color-text-secondary)">
            Nothing is merged or overwritten without being listed here. Same-name merges (case, punctuation, LLC / Co) are
            pre-ticked; similar names are only suggestions and stay separate unless you tick them. Records with different IDs
            are never merged.
          </p>
        </div>
      </div>

      {/* Fuzzy Merges Section */}
      {hasMerges && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-small font-semibold text-(--color-text-primary)">
            <Building2 size={16} className="text-(--color-brand)" />
            <span>Supplier & Warehouse Name Merges</span>
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
                        <Badge tone={group.matchKind === "similar" ? "warning" : "success"}>
                          {group.matchKind === "similar"
                            ? `Similar name · ${Math.round(group.confidence * 100)}% match · suggestion`
                            : "Same name (case / punctuation / suffix)"}
                        </Badge>
                      </div>
                      <p className="text-caption text-(--color-text-muted)">
                        {group.entityType === "warehouse" ? "Warehouse" : "Supplier"} · {group.variants.length} spellings found
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
                        {isEnabled
                          ? `Merge into one ${group.entityType}`
                          : `Keep as separate ${group.entityType === "warehouse" ? "warehouses" : "suppliers"}`}
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
                        {v.originalName}
                        {v.entityId ? ` · ${v.entityId}` : ""} ({v.rowCount} rows)
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
                        <span className="text-small">{c.supplierLabels?.[s] ?? s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Same SKU, different details on different rows */}
      {hasProductConflicts && (
        <div className="space-y-4 pt-4 border-t border-(--color-border)">
          <div className="flex items-center gap-2 text-small font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle size={16} />
            <span>Same SKU, different details ({productConflicts.length})</span>
          </div>
          <p className="text-caption text-(--color-text-secondary)">
            These SKUs appear on more than one row with different values. The first row&apos;s value is kept unless you pick
            another.
          </p>
          <div className="grid gap-3">
            {productConflicts.slice(0, MAX_LISTED).map((c) => {
              const key = `${c.sku}|${c.field}`;
              return (
                <Card key={key} className="p-4 border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={16} className="text-amber-600" />
                    <span className="font-semibold text-body text-(--color-text-primary)">{c.sku}</span>
                    <span className="text-caption text-(--color-text-muted)">{FIELD_LABELS[c.field]}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {c.options.map((o, i) => (
                      <label
                        key={i}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                          productResolutions[key] === i
                            ? "border-(--color-brand) bg-(--color-brand)/10 text-(--color-brand) font-semibold"
                            : "border-(--color-border) bg-(--color-surface) text-(--color-text-secondary)"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`product-${key}`}
                          checked={productResolutions[key] === i}
                          onChange={() => setProductResolutions((prev) => ({ ...prev, [key]: i }))}
                          className="text-(--color-brand) focus:ring-(--color-brand)"
                        />
                        <span className="text-small">
                          {String(o.value)}{" "}
                          <span className="text-(--color-text-muted)">
                            · {o.sheetName} row {o.rowNumber}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
          {productConflicts.length > MAX_LISTED && (
            <p className="text-caption text-(--color-text-muted)">
              {(productConflicts.length - MAX_LISTED).toLocaleString()} more conflicts keep their first-row value.
            </p>
          )}
        </div>
      )}

      {/* Same SKU listed more than once at a warehouse */}
      {hasDuplicates && (
        <div className="space-y-4 pt-4 border-t border-(--color-border)">
          <div className="flex items-center gap-2 text-small font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle size={16} />
            <span>Same SKU listed more than once at a warehouse ({duplicateStockPositions.length})</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {(["sum", "last"] as const).map((option) => (
              <label
                key={option}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                  duplicateResolution === option
                    ? "border-(--color-brand) bg-(--color-brand)/10 text-(--color-brand) font-semibold"
                    : "border-(--color-border) bg-(--color-surface) text-(--color-text-secondary)"
                }`}
              >
                <input
                  type="radio"
                  name="duplicate-stock"
                  checked={duplicateResolution === option}
                  onChange={() => setDuplicateResolution(option)}
                  className="text-(--color-brand) focus:ring-(--color-brand)"
                />
                <span className="text-small">
                  {option === "sum" ? "Add the quantities together" : "Keep the last row's quantity"}
                </span>
              </label>
            ))}
          </div>
          <ul className="text-caption text-(--color-text-secondary) space-y-1">
            {duplicateStockPositions.slice(0, MAX_LISTED).map((d) => (
              <li key={`${d.sku}@${d.warehouseCode}`}>
                <span className="font-mono">{d.sku}</span> at {d.warehouseCode}: {d.quantities.join(" + ")} →{" "}
                <span className="font-semibold">
                  {duplicateResolution === "sum"
                    ? d.quantities.reduce((a, b) => a + b, 0)
                    : d.quantities[d.quantities.length - 1]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clean file: nothing to review */}
      {nothingToReview && (
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
