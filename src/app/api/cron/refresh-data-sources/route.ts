/**
 * Daily refresh of every "Every day" link from Import → Automatic refresh
 * (see vercel.json's `crons`). Each source is downloaded and imported with
 * the manual-import rules; orgs that can no longer add data (no active plan)
 * are skipped and told why. Sources not reached before the time budget runs
 * out are picked up by the next run.
 */
import { listDailyDataSources, recordDataSourceRefresh } from "@/data/repositories/data-sources";
import { refreshSource } from "@/lib/sync/data-source-sync";
import { checkOrgWriteAccess } from "@/lib/auth";

export const maxDuration = 300;
const SOFT_DEADLINE_MS = 270_000;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  const deadline = Date.now() + SOFT_DEADLINE_MS;
  const sources = await listDailyDataSources();
  const canWrite = new Map<string, boolean>();
  let refreshed = 0;
  let failed = 0;
  let skipped = 0;

  for (const source of sources) {
    if (Date.now() > deadline) {
      skipped++;
      continue;
    }
    if (!canWrite.has(source.orgId)) canWrite.set(source.orgId, await checkOrgWriteAccess(source.orgId));
    if (!canWrite.get(source.orgId)) {
      await recordDataSourceRefresh(source.orgId, source.id, "Skipped: this workspace has no active plan.");
      skipped++;
      continue;
    }
    const res = await refreshSource(source.orgId, source.provider, source.url, source.dataType);
    await recordDataSourceRefresh(source.orgId, source.id, res.ok ? res.message : `Failed: ${res.error}`);
    if (res.ok) refreshed++;
    else failed++;
  }

  if (failed > 0) console.error(`[refresh-data-sources] ${failed} of ${sources.length} sources failed`);
  return Response.json({ total: sources.length, refreshed, failed, skipped });
}
