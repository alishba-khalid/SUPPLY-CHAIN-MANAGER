"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Info, Mail, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveEmailAlertSettingsAction, sendTestAlertEmailAction } from "@/app/actions/integrations";
import { EMAIL_ALERT_GROUPS, type AlertFrequency, type EmailAlertSettings } from "@/types/integrations";
import type { AlertGroup } from "@/types/supply-chain";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 10;

const inputClass =
  "w-full rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-body text-(--color-text-primary) focus:border-(--color-brand) focus:outline-none";
const labelClass = "block text-caption font-medium uppercase tracking-wider text-(--color-text-secondary) mb-1";

function hourLabel(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}

/** "a@x.com, b@y.com" → valid addresses + the ones that aren't. */
function parseRecipients(text: string): { valid: string[]; invalid: string[] } {
  const parts = text
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const unique = [...new Set(parts.map((p) => p.toLowerCase()))];
  return {
    valid: unique.filter((p) => EMAIL_PATTERN.test(p)),
    invalid: unique.filter((p) => !EMAIL_PATTERN.test(p)),
  };
}

function browserTimezone(fallback: string): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function EmailAlertsSettings({
  initial,
  available,
}: {
  initial: EmailAlertSettings;
  /** False until the backend sends email; the screen says so. */
  available: boolean;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [recipientsText, setRecipientsText] = useState(initial.recipients.join(", "));
  const [frequency, setFrequency] = useState<AlertFrequency>(initial.frequency);
  const [sendHour, setSendHour] = useState(initial.sendHour);
  // A saved timezone wins; otherwise suggest the browser's own.
  const [timezone, setTimezone] = useState(() =>
    initial.timezone !== "UTC" ? initial.timezone : browserTimezone(initial.timezone),
  );
  const [groups, setGroups] = useState<AlertGroup[]>(initial.alertGroups);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const { valid, invalid } = parseRecipients(recipientsText);

  function toggleGroup(id: AlertGroup) {
    setGroups((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  function validate(): string | null {
    if (!enabled) return null;
    if (valid.length === 0) return "Add at least one email address.";
    if (invalid.length > 0) return `These don't look like email addresses: ${invalid.join(", ")}`;
    if (valid.length > MAX_RECIPIENTS) return `Up to ${MAX_RECIPIENTS} recipients.`;
    if (groups.length === 0) return "Pick at least one kind of alert.";
    return null;
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setMessage({ tone: "error", text: problem });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await saveEmailAlertSettingsAction({
        enabled,
        recipients: valid,
        frequency,
        sendHour,
        timezone,
        alertGroups: groups,
      });
      setMessage(res.ok ? { tone: "success", text: "Alert settings saved." } : { tone: "error", text: res.error });
    });
  }

  function handleTest() {
    setMessage(null);
    startTransition(async () => {
      const res = await sendTestAlertEmailAction();
      setMessage(
        res.ok
          ? { tone: "success", text: `Test email sent to ${valid.join(", ")}.` }
          : { tone: "error", text: res.error },
      );
    });
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-h3 font-semibold text-(--color-text-primary)">
            <Mail size={18} className="text-(--color-brand)" />
            Email alerts
          </h3>
          <p className="mt-1 max-w-2xl text-body text-(--color-text-secondary)">
            Get the alerts from your Overview by email — a morning digest, or an email the moment something critical
            appears.
          </p>
        </div>
        {!available && <Badge tone="neutral">Coming soon</Badge>}
      </div>

      {!available && (
        <div className="mt-4 flex gap-2 rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-3 text-small text-(--color-text-secondary)">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>Email alerts aren&apos;t switched on yet, so nothing is sent and settings can&apos;t be saved for now.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 space-y-6">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
          <span className="text-body font-medium text-(--color-text-primary)">Send email alerts for this workspace</span>
        </label>

        <fieldset disabled={!enabled} className="space-y-6 disabled:opacity-60">
          <div>
            <label htmlFor="alert-recipients" className={labelClass}>
              Send to
            </label>
            <textarea
              id="alert-recipients"
              rows={2}
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              placeholder="buyer@yourcompany.com, ops@yourcompany.com"
              className={inputClass}
            />
            <p className="mt-1 text-caption text-(--color-text-muted)">
              Separate addresses with commas. Up to {MAX_RECIPIENTS}.
              {valid.length > 0 && ` ${valid.length} address${valid.length === 1 ? "" : "es"} ready.`}
              {invalid.length > 0 && <span className="text-red-500"> Check: {invalid.join(", ")}</span>}
            </p>
          </div>

          <div>
            <p className={labelClass}>When</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { id: "daily_digest", title: "Daily digest", body: "One email each morning listing every open alert you pick below." },
                  { id: "instant_critical", title: "Critical only, right away", body: "An email as soon as a stockout or overdue PO becomes critical." },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  className={`cursor-pointer rounded-lg border p-3 ${
                    frequency === opt.id ? "border-(--color-brand) bg-(--color-brand-subtle)" : "border-(--color-border)"
                  }`}
                >
                  <input
                    type="radio"
                    name="alert-frequency"
                    value={opt.id}
                    checked={frequency === opt.id}
                    onChange={() => setFrequency(opt.id)}
                    className="sr-only"
                  />
                  <span className="block text-body font-medium text-(--color-text-primary)">{opt.title}</span>
                  <span className="mt-0.5 block text-small text-(--color-text-secondary)">{opt.body}</span>
                </label>
              ))}
            </div>
          </div>

          {frequency === "daily_digest" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="alert-hour" className={labelClass}>
                  Send at
                </label>
                <select id="alert-hour" value={sendHour} onChange={(e) => setSendHour(Number(e.target.value))} className={inputClass}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="alert-tz" className={labelClass}>
                  Time zone
                </label>
                <input
                  id="alert-tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g. Europe/London"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div>
            <p className={labelClass}>Include</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {EMAIL_ALERT_GROUPS.map((g) => (
                <label key={g.id} className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-(--color-surface-secondary)">
                  <input type="checkbox" checked={groups.includes(g.id)} onChange={() => toggleGroup(g.id)} className="mt-1" />
                  <span>
                    <span className="block text-body font-medium text-(--color-text-primary)">{g.label}</span>
                    <span className="block text-small text-(--color-text-secondary)">{g.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        {message && (
          <div
            className={`flex gap-2 rounded-lg border p-3 text-small ${
              message.tone === "error"
                ? "border-red-500/20 bg-red-500/10 text-red-500"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
            }`}
          >
            {message.tone === "error" ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            <p>{message.text}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-(--color-border) pt-4">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save alert settings"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleTest}
            disabled={isPending || !enabled || valid.length === 0}
            className="gap-1.5"
          >
            <Send size={14} />
            Send a test email
          </Button>
        </div>
      </form>
    </Card>
  );
}
