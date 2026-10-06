"use server";

/**
 * Server actions behind Settings → Email alerts and Import → Automatic
 * refresh. The screens are finished; these are stubs that tell the user the
 * feature isn't switched on yet. Each one has a BACKEND TODO describing what
 * to build. Keep the signatures — the screens depend on them.
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
} from "@/types/integrations";

const EMAIL_NOT_AVAILABLE = "Email alerts aren't switched on yet — your settings can't be saved for now.";
const SYNC_NOT_AVAILABLE = "Automatic refresh isn't switched on yet — links can't be saved for now.";
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

/**
 * BACKEND TODO: list rows from a `data_sources` table (id, org_id, provider,
 * url, data_type, schedule, last_refreshed_at, last_result, created_at).
 */
export async function listDataSourcesAction(): Promise<{ available: boolean; sources: DataSource[] }> {
  await requireOrgId();
  return { available: false, sources: [] };
}

/**
 * BACKEND TODO: validate the URL (https only; Google Sheets "publish to web"
 * CSV links, OneDrive/SharePoint download links, or any CSV URL — never
 * fetch private/internal addresses), insert the row, then run a first
 * refresh. A refresh downloads the file and passes the rows to the same
 * import path as a manual upload (importDataAction rules for this
 * data_type), so a refresh can never invent values the importer wouldn't.
 * A daily cron route refreshes every `schedule = "daily"` source.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function saveDataSourceAction(_source: NewDataSource): Promise<ActionResult<DataSource>> {
  const blocked = await gateWrite();
  if (blocked) return blocked;
  return notAvailable(SYNC_NOT_AVAILABLE);
}

/** BACKEND TODO: delete the row (scoped to the org). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function removeDataSourceAction(_id: string): Promise<ActionResult> {
  const blocked = await gateWrite();
  if (blocked) return blocked;
  return notAvailable(SYNC_NOT_AVAILABLE);
}

/**
 * BACKEND TODO: fetch the link server-side (timeout ~10s, size cap), parse
 * it with the importer's reader, and report the row count and whether the
 * headers fit the chosen data type — without saving anything.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function testDataSourceAction(_source: NewDataSource): Promise<ActionResult<{ rows: number; note: string }>> {
  await requireOrgId();
  return notAvailable(SYNC_NOT_AVAILABLE);
}
