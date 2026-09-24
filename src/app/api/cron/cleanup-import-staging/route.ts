/**
 * Daily sweep of abandoned chunked-import uploads (see vercel.json's `crons`
 * array). Each begin also cleans its own org's stale sessions; this catches
 * orgs that never come back. Staged rows cascade with their session.
 */
import { cleanupStaleImportSessions } from "@/data/repositories/import-staging";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  const deleted = await cleanupStaleImportSessions();
  return Response.json({ deletedSessions: deleted });
}
