/**
 * Shapes shared by the Email alerts and Automatic refresh screens and the
 * server actions behind them (src/app/actions/integrations.ts). The screens
 * are built; the backend is not — see the BACKEND TODO notes in that file.
 */
import type { TemplateType } from "@/lib/importer/template-rows";
import type { AlertGroup } from "@/types/supply-chain";

// ---------------------------------------------------------------- Email alerts

export type AlertFrequency =
  /** One email a day at `sendHour` in `timezone`, listing open alerts. */
  | "daily_digest"
  /** An email as soon as a critical alert appears (plus nothing else). */
  | "instant_critical";

export interface EmailAlertSettings {
  enabled: boolean;
  /** Addresses to send to; validated on the client and must be re-checked on the server. */
  recipients: string[];
  frequency: AlertFrequency;
  /** 0–23, local hour in `timezone` for the daily digest. */
  sendHour: number;
  /** IANA name, e.g. "Europe/London". */
  timezone: string;
  /** Which alert groups to include (same groups as the Overview alerts). */
  alertGroups: AlertGroup[];
}

/** What the app emails about — the Overview's alert groups minus overall health. */
export const EMAIL_ALERT_GROUPS: { id: AlertGroup; label: string; description: string }[] = [
  { id: "stockout", label: "Stockout risk", description: "A SKU will run out before its supplier can deliver." },
  { id: "low_stock", label: "Low stock", description: "Below the reorder point but still covered for now." },
  { id: "overdue_po", label: "Overdue purchase orders", description: "A PO is past its expected date and not received." },
  { id: "demand_spike", label: "Demand spikes", description: "A SKU is selling well above its usual rate." },
  { id: "overstock", label: "Overstock", description: "Positions holding cash above their overstock threshold." },
  { id: "supplier", label: "Supplier reliability", description: "A supplier's on-time-in-full rate has dropped." },
];

export const DEFAULT_EMAIL_ALERT_SETTINGS: EmailAlertSettings = {
  enabled: false,
  recipients: [],
  frequency: "daily_digest",
  sendHour: 7,
  timezone: "UTC",
  alertGroups: ["stockout", "overdue_po", "demand_spike"],
};

// ----------------------------------------------------------- Automatic refresh

export type DataSourceProvider = "google_sheets" | "onedrive" | "csv_url";

export type RefreshSchedule = "daily" | "manual";

export interface DataSource {
  id: string;
  provider: DataSourceProvider;
  /** The published/shared link the server fetches. */
  url: string;
  /** Which template slot the file fills — same rules as a manual import. */
  dataType: TemplateType;
  schedule: RefreshSchedule;
  /** ISO timestamps / last result, filled in by the backend. */
  lastRefreshedAt: string | null;
  lastResult: string | null;
}

export type NewDataSource = Pick<DataSource, "provider" | "url" | "dataType" | "schedule">;

export const DATA_TYPE_LABELS: Record<TemplateType, string> = {
  warehouses: "Warehouses",
  suppliers: "Suppliers",
  products: "Products",
  inventory: "Inventory balances",
  purchase_orders: "Purchase orders",
  transactions: "Inventory transactions",
};

export const PROVIDER_LABELS: Record<DataSourceProvider, string> = {
  google_sheets: "Google Sheets",
  onedrive: "OneDrive / Excel Online",
  csv_url: "Other CSV link",
};

/** Result shape every integrations action returns. */
export type ActionResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; error: string; notAvailable?: boolean };
