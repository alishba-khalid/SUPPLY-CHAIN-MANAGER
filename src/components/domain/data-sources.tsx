"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Info, Link2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  refreshDataSourceAction,
  removeDataSourceAction,
  saveDataSourceAction,
  testDataSourceAction,
} from "@/app/actions/integrations";
import { linkProblem } from "@/lib/sync/source-url";
import {
  DATA_TYPE_LABELS,
  PROVIDER_LABELS,
  type DataSource,
  type DataSourceProvider,
  type NewDataSource,
  type RefreshSchedule,
} from "@/types/integrations";
import type { TemplateType } from "@/lib/importer/template-rows";

const inputClass =
  "w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none";
const labelClass = "block text-caption font-medium uppercase tracking-wider text-(--color-text-secondary) mb-1";

const HOW_TO: Record<DataSourceProvider, string[]> = {
  google_sheets: [
    "Open the sheet in Google Sheets.",
    "File → Share → Publish to web.",
    "Pick the tab with this data, choose “Comma-separated values (.csv)”, and click Publish.",
    "Copy the link it shows and paste it here.",
  ],
  onedrive: [
    "Open the workbook in OneDrive or Excel Online.",
    "Share → Copy link, with “Anyone with the link can view”.",
    "Paste the link here. Keep one table per sheet, headers in the first row.",
  ],
  csv_url: ["Paste any https link that downloads a CSV file with headers in the first row."],
};


function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function DataSources({ initial, available }: { initial: DataSource[]; available: boolean }) {
  const [sources, setSources] = useState(initial);
  const [provider, setProvider] = useState<DataSourceProvider>("google_sheets");
  const [url, setUrl] = useState("");
  const [dataType, setDataType] = useState<TemplateType>("inventory");
  const [schedule, setSchedule] = useState<RefreshSchedule>("daily");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const draft: NewDataSource = { provider, url: url.trim(), dataType, schedule };

  function check(): boolean {
    const problem = linkProblem(provider, url);
    if (problem) setMessage({ tone: "error", text: problem });
    return !problem;
  }

  function handleTest() {
    if (!check()) return;
    setMessage(null);
    startTransition(async () => {
      const res = await testDataSourceAction(draft);
      setMessage(
        res.ok
          ? { tone: "success", text: `Read ${res.value.rows.toLocaleString()} rows. ${res.value.note}` }
          : { tone: "error", text: res.error },
      );
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!check()) return;
    setMessage(null);
    startTransition(async () => {
      const res = await saveDataSourceAction(draft);
      if (res.ok) {
        setSources((s) => [...s, res.value]);
        setUrl("");
        setMessage({
          tone: "success",
          text: `Link saved and imported. ${res.value.lastResult ?? ""}`.trim(),
        });
      } else {
        setMessage({ tone: "error", text: res.error });
      }
    });
  }

  function handleRefresh(id: string) {
    setMessage(null);
    startTransition(async () => {
      const res = await refreshDataSourceAction(id);
      if (res.ok) {
        setSources((s) => s.map((x) => (x.id === id ? res.value : x)));
        setMessage({ tone: "success", text: res.value.lastResult ?? "Refreshed." });
      } else {
        setMessage({ tone: "error", text: res.error });
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removeDataSourceAction(id);
      if (res.ok) setSources((s) => s.filter((x) => x.id !== id));
      else setMessage({ tone: "error", text: res.error });
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-h3 font-semibold text-(--color-text-primary)">
            <RefreshCw size={18} className="text-(--color-brand)" />
            Automatic refresh
          </h3>
          <p className="mt-1 max-w-2xl text-body text-(--color-text-secondary)">
            Keep a Google Sheet or OneDrive workbook as your source and have it re-imported every day, with the same
            checks as a manual import.
          </p>
        </div>
        {!available && <Badge tone="neutral">Coming soon</Badge>}
      </div>

      {!available && (
        <div className="mt-4 flex gap-2 rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-3 text-small text-(--color-text-secondary)">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>Automatic refresh isn&apos;t switched on yet, so links can&apos;t be saved for now. Manual import above works today.</p>
        </div>
      )}

      {sources.length > 0 && (
        <ul className="mt-4 divide-y divide-(--color-border) rounded-lg border border-(--color-border)">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
              <Link2 size={16} className="text-(--color-text-muted)" />
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-(--color-text-primary)">
                  {DATA_TYPE_LABELS[s.dataType]} · {PROVIDER_LABELS[s.provider]}
                </p>
                <p className="truncate text-caption text-(--color-text-muted)">{s.url}</p>
                <p className="text-caption text-(--color-text-secondary)">
                  {s.schedule === "daily" ? "Refreshes daily" : "Manual refresh"} · Last refreshed {formatWhen(s.lastRefreshedAt)}
                  {s.lastResult ? ` · ${s.lastResult}` : ""}
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => handleRefresh(s.id)} disabled={isPending}>
                Refresh now
              </Button>
              <button
                type="button"
                aria-label={`Remove ${DATA_TYPE_LABELS[s.dataType]} link`}
                onClick={() => handleRemove(s.id)}
                disabled={isPending}
                className="rounded p-1.5 text-(--color-text-muted) hover:bg-(--color-surface-secondary) hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSave} className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label htmlFor="source-provider" className={labelClass}>
              Where the file lives
            </label>
            <select
              id="source-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as DataSourceProvider)}
              className={inputClass}
            >
              {(Object.keys(PROVIDER_LABELS) as DataSourceProvider[]).map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="source-url" className={labelClass}>
              Link
            </label>
            <input
              id="source-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={provider === "google_sheets" ? "https://docs.google.com/spreadsheets/d/e/…/pub?output=csv" : "https://…"}
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="source-type" className={labelClass}>
                This file holds
              </label>
              <select id="source-type" value={dataType} onChange={(e) => setDataType(e.target.value as TemplateType)} className={inputClass}>
                {(Object.keys(DATA_TYPE_LABELS) as TemplateType[]).map((t) => (
                  <option key={t} value={t}>
                    {DATA_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="source-schedule" className={labelClass}>
                Refresh
              </label>
              <select
                id="source-schedule"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as RefreshSchedule)}
                className={inputClass}
              >
                <option value="daily">Every day</option>
                <option value="manual">Only when I ask</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-4">
          <p className="text-caption font-semibold uppercase tracking-wider text-(--color-text-muted)">
            How to get a {PROVIDER_LABELS[provider]} link
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-small text-(--color-text-secondary)">
            {HOW_TO[provider].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-3 text-caption text-(--color-text-muted)">
            Use the same column headers as the import templates. Anyone with a published link can read that sheet, so
            only publish the data you mean to share.
          </p>
        </div>

        {message && (
          <div
            className={`flex gap-2 rounded-lg border p-3 text-small lg:col-span-2 ${
              message.tone === "error"
                ? "border-red-500/20 bg-red-500/10 text-red-500"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
            }`}
          >
            {message.tone === "error" ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            <p>{message.text}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 lg:col-span-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleTest} disabled={isPending || !url.trim()}>
            Test link
          </Button>
          <Button type="submit" size="sm" disabled={isPending || !url.trim()}>
            {isPending ? "Working…" : "Save and import now"}
          </Button>
        </div>
      </form>
    </div>
  );
}
