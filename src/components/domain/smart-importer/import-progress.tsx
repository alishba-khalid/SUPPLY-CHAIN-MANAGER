"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ImportProgressPhase = "reading" | "preparing" | "uploading" | "saving";

interface ImportProgressProps {
  phase: ImportProgressPhase;
  rowsSent?: number;
  totalRows?: number;
  chunksSent?: number;
  totalChunks?: number;
  reconnecting?: { attempt: number; maxAttempts: number };
  resumed?: boolean;
  onCancel?: () => void;
  cancelling?: boolean;
}

const fmt = (n: number) => n.toLocaleString("en-US");

export function ImportProgress({
  phase,
  rowsSent = 0,
  totalRows = 0,
  chunksSent = 0,
  totalChunks = 0,
  reconnecting,
  resumed,
  onCancel,
  cancelling,
}: ImportProgressProps) {
  const determinate = phase === "uploading" && totalRows > 0;
  const pct = determinate ? Math.round((rowsSent / totalRows) * 100) : phase === "saving" ? 100 : 0;

  const title =
    phase === "reading"
      ? "Reading file..."
      : phase === "preparing"
      ? "Preparing upload..."
      : phase === "uploading"
      ? `Uploading ${fmt(rowsSent)} / ${fmt(totalRows)} rows...`
      : `Saving ${fmt(totalRows)} rows...`;

  const detail = reconnecting
    ? `Connection lost — retrying (attempt ${reconnecting.attempt} of ${reconnecting.maxAttempts}). Rows already uploaded are kept.`
    : phase === "uploading"
    ? `Chunk ${fmt(Math.min(chunksSent + 1, totalChunks))} of ${fmt(totalChunks)}${resumed ? " · resumed from an earlier upload" : ""}`
    : phase === "saving"
    ? "Writing everything in one transaction — it either fully succeeds or fully rolls back."
    : phase === "reading"
    ? "Parsing the spreadsheet in your browser."
    : null;

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5 space-y-3" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <p className="text-small font-semibold text-(--color-text-primary) tabular-nums">{title}</p>
        {onCancel && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={phase === "saving" || cancelling}
            title={phase === "saving" ? "Saving can't be interrupted — it finishes or rolls back as a whole." : undefined}
          >
            {cancelling ? "Cancelling..." : "Cancel"}
          </Button>
        )}
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-(--color-surface-secondary)"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? pct : undefined}
      >
        <div
          className={cn(
            "h-full rounded-full bg-(--color-brand) transition-[width] duration-300",
            !determinate && phase !== "saving" && "w-1/3 animate-pulse",
            phase === "saving" && "animate-pulse"
          )}
          style={determinate || phase === "saving" ? { width: `${pct}%` } : undefined}
        />
      </div>
      {detail && <p className="text-caption text-(--color-text-muted)">{detail}</p>}
    </div>
  );
}
