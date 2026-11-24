"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitHealthCheckLead, type FormState } from "@/app/actions/leads";
import { Honeypot, INPUT_CLASS, LABEL_CLASS } from "./design-partner-form";
import {
  STOCKOUT_HORIZON_DAYS,
  healthCheckReportCsv,
  type HealthCheckResult,
  type SkuResult,
} from "@/lib/health-check/report";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = (n: number | null, dp = 1) => (n === null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: dp }));

type WorkerReply = { ok: true; result: HealthCheckResult } | { ok: false; error: string };

async function analyzeInBrowser(buffer: ArrayBuffer): Promise<WorkerReply> {
  try {
    const worker = new Worker(new URL("../../lib/health-check/worker.ts", import.meta.url), { type: "module" });
    return await new Promise<WorkerReply>((resolve) => {
      worker.onmessage = (e: MessageEvent<WorkerReply>) => {
        resolve(e.data);
        worker.terminate();
      };
      worker.onerror = () => {
        resolve({ ok: false, error: "We couldn't read that file. Try saving it as CSV or .xlsx." });
        worker.terminate();
      };
      worker.postMessage(buffer, [buffer]);
    });
  } catch {
    // No Worker support — run on the main thread instead.
    const { analyzeHealthCheckBuffer, HealthCheckInputError } = await import("@/lib/health-check/analyze");
    try {
      return { ok: true, result: analyzeHealthCheckBuffer(buffer) };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof HealthCheckInputError ? err.message : "We couldn't read that file. Try saving it as CSV or .xlsx.",
      };
    }
  }
}

function downloadCsv(result: HealthCheckResult) {
  const blob = new Blob([healthCheckReportCsv(result)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventory-health-check-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function HealthCheckTool() {
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is over 25 MB. Try weekly sales history or an average daily demand column instead.");
      return;
    }
    setFileName(file.name);
    setBusy(true);
    const reply = await analyzeInBrowser(await file.arrayBuffer());
    setBusy(false);
    if (reply.ok) setResult(reply.result);
    else setError(reply.error);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-8">
      <Card
        className={cn(
          "border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-(--color-brand) bg-(--color-surface-secondary)" : "border-(--color-border)",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        {busy ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 size={28} className="animate-spin text-(--color-brand)" />
            <p className="text-body text-(--color-text-secondary)">Analyzing {fileName} in your browser…</p>
          </div>
        ) : (
          <>
            <UploadCloud size={32} className="mx-auto text-(--color-brand)" />
            <p className="mt-3 text-body font-medium text-(--color-text-primary)">Drop a CSV or Excel file here</p>
            <p className="mt-1 text-small text-(--color-text-muted)">.csv, .xlsx or .xls, up to 25 MB</p>
            <Button type="button" variant="primary" size="lg" className="mt-5" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.xlsm,text/csv"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </>
        )}
      </Card>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-(--color-critical) p-4 text-small text-(--color-critical)">
          <AlertTriangle size={18} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && <Results result={result} />}
    </div>
  );
}

function Results({ result }: { result: HealthCheckResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="SKUs analyzed" value={result.skuCount.toLocaleString()} />
        <Stat
          label={`At stockout risk in next ${STOCKOUT_HORIZON_DAYS} days`}
          value={result.stockoutRiskCount.toLocaleString()}
          tone={result.stockoutRiskCount > 0 ? "critical" : undefined}
        />
        <Stat label="Cash in excess inventory" value={usd(result.excessValue)} tone={result.excessValue > 0 ? "warning" : undefined} />
      </div>

      {result.warnings.length > 0 && (
        <ul className="space-y-1 text-small text-(--color-text-muted)">
          {result.warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopList
          title="Top 5 by stockout risk"
          empty={`No SKUs run out within ${STOCKOUT_HORIZON_DAYS} days at current demand.`}
          rows={result.topRisk}
          metricLabel="Days until stockout"
          metric={(r) => (r.onHand <= 0 ? "Out now" : `${num(r.daysOfCover)} days`)}
          detail={(r) => `${num(r.onHand, 0)} on hand · ${num(r.avgDailyDemand, 2)}/day`}
        />
        <TopList
          title="Top 5 by excess cash"
          empty="No SKUs are holding more than 3x their lead-time target."
          rows={result.topExcess}
          metricLabel="Excess value"
          metric={(r) => usd(r.excessValue)}
          detail={(r) => `${num(r.excessUnits, 0)} excess units · ${r.avgDailyDemand ? `${num(r.daysOfCover, 0)} days until stockout` : "no recent sales"}`}
        />
      </div>

      <p className="text-caption text-(--color-text-muted)">
        Stockout risk = on-hand stock covers {STOCKOUT_HORIZON_DAYS} days of demand or fewer. Excess = units above 3x the
        lead-time target stock (lead-time demand + safety stock), valued at unit cost — the same overstock definition
        the product dashboard uses.
      </p>

      <ReportGate result={result} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "critical" | "warning" }) {
  return (
    <Card className="p-5">
      <p className="text-small text-(--color-text-secondary)">{label}</p>
      <p
        className={cn(
          "mt-1 text-3xl font-extrabold",
          tone === "critical" ? "text-(--color-critical)" : tone === "warning" ? "text-(--color-warning)" : "text-(--color-text-primary)",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function TopList({
  title,
  empty,
  rows,
  metricLabel,
  metric,
  detail,
}: {
  title: string;
  empty: string;
  rows: SkuResult[];
  metricLabel: string;
  metric: (r: SkuResult) => string;
  detail: (r: SkuResult) => string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-h3 text-(--color-text-primary)">{title}</h3>
        <span className="text-caption text-(--color-text-muted)">{metricLabel}</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-small text-(--color-text-secondary)">{empty}</p>
      ) : (
        <ol className="mt-4 divide-y divide-(--color-border)">
          {rows.map((r) => (
            <li key={r.sku} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-body font-medium text-(--color-text-primary)">{r.sku}</p>
                <p className="text-caption text-(--color-text-muted)">{detail(r)}</p>
              </div>
              <p className="shrink-0 text-body font-semibold text-(--color-text-primary)">{metric(r)}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

const INITIAL: FormState = { status: "idle" };

function ReportGate({ result }: { result: HealthCheckResult }) {
  const [state, formAction, pending] = useActionState(submitHealthCheckLead, INITIAL);

  useEffect(() => {
    if (state.status === "success") downloadCsv(result);
  }, [state, result]);

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <FileSpreadsheet size={22} className="mt-0.5 shrink-0 text-(--color-brand)" />
        <div>
          <h3 className="text-h3 text-(--color-text-primary)">Get the full report for every SKU</h3>
          <p className="mt-1 text-small text-(--color-text-secondary)">
            Days until stockout, reorder point, overstock threshold, and excess units and dollars for all{" "}
            {result.skuCount.toLocaleString()} SKUs, as a CSV. The report is built in your browser; we only store your
            email and company name.
          </p>
        </div>
      </div>

      {state.status === "success" ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-small font-medium text-emerald-600 dark:text-emerald-400">Your report is downloading.</p>
          <Button type="button" variant="secondary" onClick={() => downloadCsv(result)}>
            <Download size={16} />
            Download again
          </Button>
        </div>
      ) : (
        <form action={formAction} className="relative mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Honeypot />
          <div>
            <label htmlFor="hc-email" className={LABEL_CLASS}>Work email</label>
            <input id="hc-email" name="workEmail" type="email" required autoComplete="email" className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="hc-company" className={LABEL_CLASS}>Company name</label>
            <input id="hc-company" name="companyName" required autoComplete="organization" className={INPUT_CLASS} />
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            <Download size={16} />
            {pending ? "Preparing…" : "Download report"}
          </Button>
          {state.status === "error" && (
            <p role="alert" className="text-small font-medium text-(--color-critical) sm:col-span-3">{state.message}</p>
          )}
        </form>
      )}
    </Card>
  );
}
