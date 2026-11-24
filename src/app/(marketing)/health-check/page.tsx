import type { Metadata } from "next";
import { Download, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { HealthCheckTool } from "@/components/marketing/health-check-tool";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `Free Inventory Health Check | ${SITE_NAME}`;
const DESCRIPTION =
  "Upload your inventory spreadsheet and see which SKUs will stock out in the next 14 days and how much cash is tied up in excess stock. No signup — your file never leaves your browser.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/health-check` },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/health-check`, siteName: SITE_NAME, type: "website" },
};

const COLUMNS: { name: string; note: string }[] = [
  { name: "sku", note: "Required" },
  { name: "on_hand_qty", note: "Required" },
  { name: "unit_cost", note: "Required for $ figures" },
  { name: "avg_daily_demand", note: "Or sales history below" },
  { name: "date + qty_sold", note: "Daily or weekly sales history, one row per SKU per period" },
  { name: "lead_time_days", note: "Optional — 14 days assumed if blank" },
];

export default function HealthCheckPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-small font-medium uppercase tracking-wide text-(--color-text-muted)">No signup required</p>
      <h1 className="mt-2 text-h1 text-(--color-text-primary)">Free inventory health check</h1>
      <p className="mt-4 max-w-3xl text-body-lg text-(--color-text-secondary)">
        Upload your stock spreadsheet and see, in under a minute, which SKUs will run out in the next 14 days and how
        much cash is sitting in excess inventory.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-4">
        <Lock size={18} className="mt-0.5 shrink-0 text-emerald-500" />
        <p className="text-small text-(--color-text-primary)">
          <strong>Your file never leaves your browser.</strong> It&apos;s analyzed on your device and is not uploaded
          to or stored on our servers — close this tab and it&apos;s gone. If you request the full report, we store only
          your work email and company name.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <HealthCheckTool />

        <Card className="h-fit p-5">
          <h2 className="text-h3 text-(--color-text-primary)">What to upload</h2>
          <p className="mt-1 text-small text-(--color-text-secondary)">A CSV or Excel export with these columns:</p>
          <ul className="mt-4 space-y-2.5">
            {COLUMNS.map((c) => (
              <li key={c.name} className="text-small">
                <code className="font-mono text-(--color-text-primary)">{c.name}</code>
                <span className="block text-caption text-(--color-text-muted)">{c.note}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 border-t border-(--color-border) pt-4">
            <a
              href="/templates/health-check-template.csv"
              download
              className="flex items-center gap-2 text-small font-medium text-(--color-brand) hover:underline"
            >
              <Download size={14} />
              Sample template (average demand)
            </a>
            <a
              href="/templates/health-check-template-weekly-history.csv"
              download
              className="flex items-center gap-2 text-small font-medium text-(--color-brand) hover:underline"
            >
              <Download size={14} />
              Sample template (weekly sales history)
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
