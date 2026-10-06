"use server";

/**
 * Server actions behind Settings → Email alerts and Import → Automatic
 * refresh. Automatic refresh is built (bottom of this file). Email alerts
 * are still stubs that tell the user the feature isn't switched on yet; each
 * has a BACKEND TODO describing what to build. Keep the signatures.
 *
 * Shared rules for every action:
 *   - orgId always comes from requireOrgId() (session), never from input.
 *   - Writes check checkOrgWriteAccess(); the demo org never saves.
 *   - Database access goes through a repository in src/data/repositories/.
 */
import { requireOrgId, isDemoOrg, checkOrgWriteAccess } from "@/lib/auth";
import { WRITE_BLOCKED_MESSAGE } from "@/lib/subscriptions/write-access";
import {
  DEFAULT_EMAIL_ALERT_SETTINGS,
  type ActionResult,
  type DataSource,
  type EmailAlertSettings,
  type NewDataSource,
  type DataSourceProvider,
  type RefreshSchedule,
} from "@/types/integrations";
import type { TemplateType } from "@/lib/importer/template-rows";
import { revalidatePath } from "next/cache";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { linkProblem } from "@/lib/sync/source-url";
import { refreshSource, testSource } from "@/lib/sync/data-source-sync";
import {
  MAX_SOURCES_PER_ORG,
  countDataSources,
  deleteDataSource,
  getDataSource,
  insertDataSource,
  listDataSources,
  recordDataSourceRefresh,
} from "@/data/repositories/data-sources";

const EMAIL_NOT_AVAILABLE = "Email alerts aren't switched on yet — your settings can't be saved for now.";

const DEMO_MESSAGE = "Demo mode — nothing is saved.";

function notAvailable<T>(error: string): ActionResult<T> {
  return { ok: false, error, notAvailable: true };
}

async function gateWrite(): Promise<ActionResult<never> | null> {
  const orgId = await requireOrgId();
  if (isDemoOrg(orgId)) return { ok: false, error: DEMO_MESSAGE };
  if (!(await checkOrgWriteAccess(orgId))) return { ok: false, error: WRITE_BLOCKED_MESSAGE };
  return null;
}

// ---------------------------------------------------------------- Email alerts

/**
 * BACKEND TODO: read this org's row from an `email_alert_settings` table
 * (org_id PK, enabled, recipients text[], frequency, send_hour, timezone,
 * alert_groups text[], last_sent_at, updated_at). Return `available: true`
 * once sending works so the screen drops its "not switched on" banner.
 */
export async function getEmailAlertSettingsAction(): Promise<{ available: boolean; settings: EmailAlertSettings }> {
  await requireOrgId();
  return { available: false, settings: DEFAULT_EMAIL_ALERT_SETTINGS };
}

/**
 * BACKEND TODO: validate on the server (each recipient a real address, max
 * ~10; sendHour 0–23; timezone accepted by Intl.DateTimeFormat; groups from
 * EMAIL_ALERT_GROUPS) and upsert the row.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function saveEmailAlertSettingsAction(_settings: EmailAlertSettings): Promise<ActionResult> {
  const blocked = await gateWrite();
  if (blocked) return blocked;
  return notAvailable(EMAIL_NOT_AVAILABLE);
}

/**
 * BACKEND TODO: send one email now to the saved recipients with the org's
 * current alerts (src/lib/insights/alerts.ts), via the email provider
 * (e.g. Resend: RESEND_API_KEY + EMAIL_FROM on a verified domain). Rate-limit
 * it (src/lib/rate-limit.ts). The real schedule is a cron route that sends
 * each org's digest at its local sendHour, at most once a day, and skips orgs
 * with no data or no open alerts.
 */
export async function sendTestAlertEmailAction(): Promise<ActionResult> {
  const blocked = await gateWrite();
  if (blocked) return blocked;
  return notAvailable(EMAIL_NOT_AVAILABLE);
}

// ----------------------------------------------------------- Automatic refresh
//
// Built: links are stored in `data_sources` and refreshed by
// src/lib/sync/data-source-sync.ts (manual import rules; never clears data).
// A daily cron (/api/cron/refresh-data-sources) refreshes "daily" sources.

const PROVIDERS: DataSourceProvider[] = ["google_sheets", "onedrive", "csv_url"];
const TYPES: TemplateType[] = ["warehouses", "suppliers", "products", "inventory", "purchase_orders", "transactions"];
const SCHEDULES: RefreshSchedule[] = ["daily", "manual"];
const TEST_LIMIT = 20; // link tests per IP per 10 minutes
const TEST_WINDOW_MS = 10 * 60 * 1000;

/** Rejects anything the screen couldn't have sent. */
function cleanSource(input: NewDataSource): NewDataSource | string {
  if (!PROVIDERS.includes(input?.provider)) return "Choose where the file lives.";
  if (!TYPES.includes(input?.dataType)) return "Choose what the file holds.";
  if (!SCHEDULES.includes(input?.schedule)) return "Choose how often to refresh.";
  const url = String(input?.url ?? "").trim();
  const problem = linkProblem(input.provider, url);
  if (problem) return problem;
  return { provider: input.provider, url, dataType: input.dataType, schedule: input.schedule };
}

export async function listDataSourcesAction(): Promise<{ available: boolean; sources: DataSource[] }> {
  const orgId = await requireOrgId();
  if (isDemoOrg(orgId)) return { available: true, sources: [] };
  try {
    return { available: true, sources: await listDataSources(orgId) };
  } catch (err) {
    // e.g. the data_sources migration isn't applied to this database yet.
    console.error(`[sync] org ${orgId}: could not list data sources: ${err instanceof Error ? err.name : "unknown error"}`);
    return { available: false, sources: [] };
  }
}

export async function saveDataSourceAction(input: NewDataSource): Promise<ActionResult<DataSource>> {
  const blocked = await gateWrite();
  if (blocked) return blocked;
  const orgId = await requireOrgId();
  const source = cleanSource(input);
  if (typeof source === "string") return { ok: false, error: source };
  if ((await countDataSources(orgId)) >= MAX_SOURCES_PER_ORG) {
    return { ok: false, error: `Up to ${MAX_SOURCES_PER_ORG} links per workspace. Remove one first.` };
  }

  // Only save a link that works today, then import it straight away.
  const first = await refreshSource(orgId, source.provider, source.url, source.dataType);
  if (!first.ok) return { ok: false, error: first.error };
  const saved = await insertDataSource(orgId, source);
  const updated = await recordDataSourceRefresh(orgId, saved.id, first.message);
  revalidateImportedPages();
  return { ok: true, value: updated ?? saved };
}

export async function removeDataSourceAction(id: string): Promise<ActionResult> {
  const blocked = await gateWrite();
  if (blocked) return blocked;
  const orgId = await requireOrgId();
  if (!(await deleteDataSource(orgId, String(id)))) return { ok: false, error: "That link was already removed." };
  revalidatePath("/dashboard/import");
  return { ok: true, value: undefined };
}

export async function refreshDataSourceAction(id: string): Promise<ActionResult<DataSource>> {
  const blocked = await gateWrite();
  if (blocked) return blocked;
  const orgId = await requireOrgId();
  const source = await getDataSource(orgId, String(id));
  if (!source) return { ok: false, error: "That link no longer exists." };
  const res = await refreshSource(orgId, source.provider, source.url, source.dataType);
  const updated = await recordDataSourceRefresh(orgId, source.id, res.ok ? res.message : `Failed: ${res.error}`);
  if (!res.ok) return { ok: false, error: res.error };
  revalidateImportedPages();
  return { ok: true, value: updated ?? source };
}

export async function testDataSourceAction(input: NewDataSource): Promise<ActionResult<{ rows: number; note: string }>> {
  await requireOrgId();
  const source = cleanSource(input);
  if (typeof source === "string") return { ok: false, error: source };
  const ip = await getRequestIp();
  const rate = await checkRateLimit(`sync-test:ip:${ip}`, TEST_LIMIT, TEST_WINDOW_MS);
  if (!rate.allowed) return { ok: false, error: "Too many link tests — please wait a few minutes." };
  const res = await testSource(source.provider, source.url, source.dataType);
  return res.ok ? { ok: true, value: { rows: res.rows, note: res.message } } : { ok: false, error: res.error };
}

function revalidateImportedPages() {
  for (const path of ["overview", "inventory", "procurement", "suppliers", "warehouses", "logistics", "analytics", "import"]) {
    revalidatePath(`/dashboard/${path}`);
  }
}
