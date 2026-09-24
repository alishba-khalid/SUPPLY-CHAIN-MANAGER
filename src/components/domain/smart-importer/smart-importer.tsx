"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { UploadStep } from "./upload-step";
import { MappingStep } from "./mapping-step";
import { MergesStep, type MergeDecisions } from "./merges-step";
import { PreviewStep } from "./preview-step";
import { SummaryStep } from "./summary-step";
import { DataImporter } from "../data-importer";
import { LoadingState } from "@/components/ui/loading-state";
import { AlertCircle, Check, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

import { generateSheetColumnMappings, computeHeadersSignature } from "@/lib/importer/mapping";
import { extractEntitiesFromWorkbook } from "@/lib/importer/extractor";
import {
  beginImportAction,
  cancelImportAction,
  commitImportAction,
  getImportLimitAction,
  getImportStatusAction,
  getOrgMappingAction,
  saveOrgMappingAction,
  stageImportChunkAction,
} from "@/app/actions/smart-import";
import { formatLimitNote } from "@/lib/importer/chunked-import";
import { runChunkedImport, type ImportTransport, type UploadProgress } from "@/lib/importer/chunked-upload";
import { ImportProgress } from "./import-progress";

import type {
  RawParsedSheet,
  SheetMapping,
  FuzzyMergeGroup,
  SkuSupplierConflict,
  ProductDetailConflict,
  DuplicateStockPosition,
  SkuDuplicateResolution,
  ExtractionPreview,
  ImportCommitResult,
} from "@/lib/importer/types";

const importTransport: ImportTransport = {
  begin: beginImportAction,
  stage: stageImportChunkAction,
  status: getImportStatusAction,
  commit: commitImportAction,
  cancel: cancelImportAction,
};

/** The review step is shown whenever anything was merged, suggested, conflicting or duplicated. */
function needsReview(p: {
  mergeGroups: unknown[];
  skuConflicts: unknown[];
  productConflicts: unknown[];
  duplicateStockPositions: unknown[];
}): boolean {
  return p.mergeGroups.length > 0 || p.skuConflicts.length > 0 || p.productConflicts.length > 0 || p.duplicateStockPositions.length > 0;
}

export type WizardStep = "upload" | "mapping" | "merges" | "preview" | "summary";

export function SmartImporter() {
  const [mode, setMode] = useState<"smart" | "legacy">("smart");
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [skippedSteps, setSkippedSteps] = useState<Record<string, boolean>>({});

  // Workbook state
  const [, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<RawParsedSheet[]>([]);
  const [sheetMappings, setSheetMappings] = useState<SheetMapping[]>([]);
  const [rememberInDb, setRememberInDb] = useState(true);

  // Deduplication & Conflict state
  const [mergeGroups, setMergeGroups] = useState<FuzzyMergeGroup[]>([]);
  const [skuConflicts, setSkuConflicts] = useState<SkuSupplierConflict[]>([]);
  const [resolvedSkuConflicts, setResolvedSkuConflicts] = useState<Record<string, string>>({});
  const [productConflicts, setProductConflicts] = useState<ProductDetailConflict[]>([]);
  const [productConflictResolutions, setProductConflictResolutions] = useState<Record<string, number>>({});
  const [duplicateStockPositions, setDuplicateStockPositions] = useState<DuplicateStockPosition[]>([]);
  const [skuDuplicateResolution, setSkuDuplicateResolution] = useState<SkuDuplicateResolution>("sum");

  // Preview & Result state
  const [preview, setPreview] = useState<ExtractionPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportCommitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Over-the-limit is a plan boundary, not an error: shown as a neutral note.
  const [limitNote, setLimitNote] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState<number | null>(null);

  // Chunked upload state
  const [upload, setUpload] = useState<UploadProgress | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getImportLimitAction()
      .then((res) => setRowLimit(res.limit))
      .catch(() => setRowLimit(null));
  }, []);

  async function handleFileLoaded(loadedFile: File, rawSheets: RawParsedSheet[]) {
    setFile(loadedFile);
    setSheets(rawSheets);
    setErrorMessage(null);
    setLimitNote(null);

    // Checked before any mapping or upload work. The server enforces the
    // same limit again when the upload begins.
    const totalRows = rawSheets.reduce((sum, s) => sum + s.rawRows.length, 0);
    if (rowLimit !== null && totalRows > rowLimit) {
      setLimitNote(formatLimitNote(totalRows, rowLimit));
      return;
    }

    startTransition(async () => {
      try {
        // Generate column mappings for each sheet
        const initialMappings: SheetMapping[] = [];

        for (const s of rawSheets) {
          const sig = computeHeadersSignature(s.headers);
          const dbMappingRes = await getOrgMappingAction(sig);

          const generated = generateSheetColumnMappings(s.headers, s.rawRows);

          if (dbMappingRes.mapping) {
            // Apply saved DB mapping
            const savedLookup = new Map(
              dbMappingRes.mapping.flatMap((m) => m.mappings.map((item) => [item.rawHeader, item.canonicalField]))
            );

            const mappedCols = generated.map((col) => {
              const savedField = savedLookup.get(col.rawHeader);
              if (savedField !== undefined) {
                return {
                  ...col,
                  canonicalField: savedField,
                  confidence: 1.0,
                  matchReason: "Restored from database workspace memory (I2)",
                };
              }
              return col;
            });
            initialMappings.push({
              sheetName: s.name,
              headerRowIndex: s.headerRowIndex,
              mappings: mappedCols,
            });
          } else {
            initialMappings.push({
              sheetName: s.name,
              headerRowIndex: s.headerRowIndex,
              mappings: generated,
            });
          }
        }

        setSheetMappings(initialMappings);

        // Check I6: Should we auto-skip mapping step?
        const allHighConfidence = initialMappings.every((sheet) =>
          sheet.mappings.every(
            (col) => col.canonicalField === null || col.confidence >= 0.90
          )
        );

        // Run initial extraction to check for merge candidates and conflicts
        const preliminaryPreview = extractEntitiesFromWorkbook(rawSheets, initialMappings);
        setMergeGroups(preliminaryPreview.mergeGroups);
        setSkuConflicts(preliminaryPreview.skuConflicts);
        setProductConflicts(preliminaryPreview.productConflicts);
        setDuplicateStockPositions(preliminaryPreview.duplicateStockPositions);
        setPreview(preliminaryPreview);

        const hasMergesOrConflicts = needsReview(preliminaryPreview);

        const updatedSkipped: Record<string, boolean> = {};

        if (allHighConfidence) {
          updatedSkipped["mapping"] = true;
        }
        if (!hasMergesOrConflicts) {
          updatedSkipped["merges"] = true;
        }
        setSkippedSteps(updatedSkipped);

        // Navigate to appropriate next step
        if (!allHighConfidence) {
          setCurrentStep("mapping");
        } else if (hasMergesOrConflicts) {
          setCurrentStep("merges");
        } else {
          setCurrentStep("preview");
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to parse workbook sheets."
        );
      }
    });
  }

  // STEP 2 -> STEP 3 / 4
  function handleMappingsConfirmed(
    updatedMappings: SheetMapping[],
    remember: boolean
  ) {
    setSheetMappings(updatedMappings);
    setRememberInDb(remember);

    // Re-extract preview with updated mappings
    // Merge groups are regenerated for the new mapping (the old ones may name
    // columns that no longer map); the other review choices carry over.
    const updatedPreview = extractEntitiesFromWorkbook(sheets, updatedMappings, {
      skuSupplierResolutions: resolvedSkuConflicts,
      productConflictResolutions,
      skuDuplicateResolution,
    });

    setMergeGroups(updatedPreview.mergeGroups);
    setSkuConflicts(updatedPreview.skuConflicts);
    setProductConflicts(updatedPreview.productConflicts);
    setDuplicateStockPositions(updatedPreview.duplicateStockPositions);
    setPreview(updatedPreview);

    const hasMergesOrConflicts = needsReview(updatedPreview);

    if (!hasMergesOrConflicts) {
      setSkippedSteps((prev) => ({ ...prev, merges: true }));
      setCurrentStep("preview");
    } else {
      setCurrentStep("merges");
    }
  }

  // STEP 3 -> STEP 4
  function handleMergesConfirmed(decisions: MergeDecisions) {
    setMergeGroups(decisions.mergeGroups);
    setResolvedSkuConflicts(decisions.skuSupplierResolutions);
    setProductConflictResolutions(decisions.productConflictResolutions);
    setSkuDuplicateResolution(decisions.skuDuplicateResolution);

    // Re-extract with exactly what the user confirmed on the review step
    const updatedPreview = extractEntitiesFromWorkbook(sheets, sheetMappings, {
      mergeGroups: decisions.mergeGroups,
      skuSupplierResolutions: decisions.skuSupplierResolutions,
      productConflictResolutions: decisions.productConflictResolutions,
      skuDuplicateResolution: decisions.skuDuplicateResolution,
    });
    setSkuConflicts(updatedPreview.skuConflicts);
    setProductConflicts(updatedPreview.productConflicts);
    setDuplicateStockPositions(updatedPreview.duplicateStockPositions);
    setPreview(updatedPreview);
    setCurrentStep("preview");
  }

  // STEP 4 -> STEP 5: chunked upload, then one atomic commit
  async function handleCommitImport(clearExisting: boolean) {
    if (!preview || upload) return;

    setErrorMessage(null);
    setLimitNote(null);
    setCancelling(false);
    const controller = new AbortController();
    abortRef.current = controller;
    setUpload({ phase: "preparing", rowsSent: 0, totalRows: 0, chunksSent: 0, totalChunks: 0 });

    try {
      if (rememberInDb && sheetMappings.length > 0) {
        for (const sheet of sheetMappings) {
          const sig = computeHeadersSignature(sheet.mappings.map((m) => m.rawHeader));
          await saveOrgMappingAction(sig, sheetMappings);
        }
      }

      const result = await runChunkedImport(
        {
          warehouses: preview.warehouses,
          suppliers: preview.suppliers,
          products: preview.products,
          inventory: preview.inventory,
          purchaseOrders: preview.purchaseOrders,
          transactions: preview.transactions,
        },
        clearExisting,
        importTransport,
        { onProgress: setUpload, signal: controller.signal }
      );

      if (!result.ok) {
        if (result.limitExceeded) setLimitNote(result.error);
        else if (!result.cancelled) setErrorMessage(result.error);
        return;
      }

      setImportResult({
        success: true,
        importedCounts: result.counts,
        missingLeadTimeCount: preview.missingLeadTimeCount,
        missingCapacityCount: preview.missingCapacityCount,
        duplicateTransactionsSkipped: result.duplicateTransactionsSkipped,
        simulated: result.simulated,
      });
      setCurrentStep("summary");
    } catch (err) {
      setErrorMessage(err instanceof Error ? `Import failed: ${err.message}` : "Import failed before any rows were saved.");
    } finally {
      abortRef.current = null;
      setUpload(null);
      setCancelling(false);
    }
  }

  function handleCancelUpload() {
    setCancelling(true);
    abortRef.current?.abort();
  }

  function handleReset() {
    setFile(null);
    setSheets([]);
    setSheetMappings([]);
    setMergeGroups([]);
    setSkuConflicts([]);
    setResolvedSkuConflicts({});
    setProductConflicts([]);
    setProductConflictResolutions({});
    setDuplicateStockPositions([]);
    setSkuDuplicateResolution("sum");
    setPreview(null);
    setImportResult(null);
    setErrorMessage(null);
    setLimitNote(null);
    setSkippedSteps({});
    setCurrentStep("upload");
  }

  if (mode === "legacy") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-body font-semibold text-(--color-text-primary)">
              Template Import Mode (Strict 6-File Importer)
            </h3>
          </div>
          <button
            onClick={() => setMode("smart")}
            className="flex items-center gap-1.5 text-small font-semibold text-(--color-brand) hover:underline"
          >
            <Sparkles size={14} /> Switch to Smart AI Importer
          </button>
        </div>
        <DataImporter />
      </div>
    );
  }

  const stepsList: { key: WizardStep; label: string; number: number }[] = [
    { key: "upload", label: "Upload", number: 1 },
    { key: "mapping", label: "Column Mapping", number: 2 },
    { key: "merges", label: "Merges & Conflicts", number: 3 },
    { key: "preview", label: "Extraction Preview", number: 4 },
    { key: "summary", label: "Completed", number: 5 },
  ];

  const currentStepIndex = stepsList.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-8">
      {/* Wizard Progress Stepper */}
      {currentStep !== "upload" && (
        <div className="flex items-center justify-between max-w-2xl mx-auto px-4">
          {stepsList.map((step, idx) => {
            const isCurrent = step.key === currentStep;
            const isCompleted = idx < currentStepIndex;
            const isSkipped = skippedSteps[step.key] && !isCurrent && !isCompleted;

            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <button
                    disabled={idx > currentStepIndex || step.key === "summary"}
                    onClick={() => setCurrentStep(step.key)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-caption font-semibold transition-all select-none",
                      isCurrent
                        ? "bg-(--color-brand) text-white ring-4 ring-(--color-brand)/20"
                        : isCompleted
                        ? "bg-emerald-500 text-white hover:opacity-90 cursor-pointer"
                        : isSkipped
                        ? "bg-(--color-surface-secondary) text-(--color-text-muted) border border-(--color-border)"
                        : "bg-(--color-surface-secondary) text-(--color-text-muted)"
                    )}
                  >
                    {isCompleted ? <Check size={14} /> : step.number}
                  </button>
                  <span
                    className={cn(
                      "mt-1 text-xs font-medium text-center hidden sm:block",
                      isCurrent
                        ? "text-(--color-brand) font-semibold"
                        : isCompleted
                        ? "text-(--color-text-primary)"
                        : "text-(--color-text-muted)"
                    )}
                  >
                    {step.label}
                    {isSkipped && (
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                        (Auto-cleared)
                      </span>
                    )}
                  </span>
                </div>

                {idx < stepsList.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-10 sm:w-16 mx-1 sm:mx-2",
                      idx < currentStepIndex
                        ? "bg-emerald-500"
                        : "bg-(--color-border)"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-small text-red-600 dark:text-red-400">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span className="whitespace-pre-line">{errorMessage}</span>
        </div>
      )}

      {/* Plan limit — a neutral note, not an error */}
      {limitNote && (
        <div className="flex items-start gap-2.5 rounded-xl border border-(--color-border) bg-(--color-surface-secondary) p-4 text-small text-(--color-text-secondary)">
          <Info size={18} className="shrink-0 mt-0.5 text-(--color-text-muted)" />
          <span>{limitNote}</span>
        </div>
      )}

      {/* Step Renderers */}
      {upload ? (
        <ImportProgress
          phase={upload.phase}
          rowsSent={upload.rowsSent}
          totalRows={upload.totalRows}
          chunksSent={upload.chunksSent}
          totalChunks={upload.totalChunks}
          reconnecting={upload.reconnecting}
          resumed={upload.resumed}
          onCancel={handleCancelUpload}
          cancelling={cancelling}
        />
      ) : isPending ? (
        <div className="py-12">
          <LoadingState message="Processing spreadsheet through Smart Pipeline (Clean -> Map -> Cluster -> Extract)..." />
        </div>
      ) : currentStep === "upload" ? (
        <UploadStep
          onFileLoaded={handleFileLoaded}
          onSwitchToLegacy={() => setMode("legacy")}
          isProcessing={isPending}
          rowLimit={rowLimit}
        />
      ) : currentStep === "mapping" ? (
        <MappingStep
          sheetMappings={sheetMappings}
          rawSheets={sheets}
          onUpdateMappings={handleMappingsConfirmed}
          onBack={() => setCurrentStep("upload")}
          rememberInDb={rememberInDb}
          setRememberInDb={setRememberInDb}
        />
      ) : currentStep === "merges" ? (
        <MergesStep
          mergeGroups={mergeGroups}
          skuConflicts={skuConflicts}
          productConflicts={productConflicts}
          duplicateStockPositions={duplicateStockPositions}
          skuDuplicateResolution={skuDuplicateResolution}
          onConfirmMerges={handleMergesConfirmed}
          onBack={() => setCurrentStep("mapping")}
        />
      ) : currentStep === "preview" && preview ? (
        <PreviewStep
          preview={preview}
          onCommitImport={handleCommitImport}
          onBack={() => {
            if (mergeGroups.length > 0 || skuConflicts.length > 0 || productConflicts.length > 0 || duplicateStockPositions.length > 0) {
              setCurrentStep("merges");
            } else {
              setCurrentStep("mapping");
            }
          }}
          onGoToMapping={() => setCurrentStep("mapping")}
          isCommitting={upload !== null}
        />
      ) : currentStep === "summary" && importResult ? (
        <SummaryStep result={importResult} onReset={handleReset} />
      ) : null}
    </div>
  );
}
