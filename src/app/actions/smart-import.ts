"use server";

import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { saveOrgImportMapping, getOrgImportMapping } from "@/data/repositories/smart-import";
import {
  beginImportSession,
  cancelImportSession,
  commitImportSession,
  getImportRowLimit,
  getImportSessionStatus,
  stageImportChunk,
} from "@/data/repositories/import-staging";
import type { BeginResult, CommitResult, StageResult, StagedRow, StatusResult } from "@/lib/importer/chunked-import";
import type { SheetMapping } from "@/lib/importer/types";
import { revalidatePath } from "next/cache";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

// Chunked import: the browser parses the file and sends rows 2,000 at a time
// (each request well under next.config.ts's 2MB serverActions.bodySizeLimit),
// then one commit call moves everything into the real tables in a single
// transaction. The orgId always comes from the session, never the client.

const IMPORT_PER_IP_LIMIT = 10;
const IMPORT_PER_IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function getImportLimitAction(): Promise<{ limit: number }> {
  const orgId = await requireOrgId();
  return { limit: await getImportRowLimit(orgId, isDemoOrg(orgId)) };
}

export async function beginImportAction(input: {
  fingerprint: string;
  totalRows: number;
  totalChunks: number;
  clearExisting: boolean;
}): Promise<BeginResult> {
  const orgId = await requireOrgId();
  const rowLimit = await getImportRowLimit(orgId, isDemoOrg(orgId));

  // Rate-limit whole imports (one begin each), not chunks — a large file is
  // hundreds of chunk calls by design.
  const ip = await getRequestIp();
  const rateLimit = await checkRateLimit(`import:ip:${ip}`, IMPORT_PER_IP_LIMIT, IMPORT_PER_IP_WINDOW_MS);
  if (!rateLimit.allowed) {
    return { ok: false, error: "Too many import attempts — please wait a few minutes and try again." };
  }

  return beginImportSession(orgId, {
    fingerprint: input.fingerprint,
    totalRows: input.totalRows,
    totalChunks: input.totalChunks,
    clearExisting: Boolean(input.clearExisting),
    rowLimit,
  });
}

export async function stageImportChunkAction(sessionId: string, chunkIndex: number, rows: StagedRow[]): Promise<StageResult> {
  const orgId = await requireOrgId();
  return stageImportChunk(orgId, sessionId, chunkIndex, rows);
}

export async function getImportStatusAction(sessionId: string): Promise<StatusResult> {
  const orgId = await requireOrgId();
  return getImportSessionStatus(orgId, sessionId);
}

export async function cancelImportAction(sessionId: string): Promise<void> {
  const orgId = await requireOrgId();
  await cancelImportSession(orgId, sessionId);
}

export async function commitImportAction(sessionId: string): Promise<CommitResult> {
  const orgId = await requireOrgId();

  // The shared public demo org is never written to: the commit runs in full
  // (validation, every insert) inside the transaction and is then rolled
  // back, so visitors get real counts without changing the demo data.
  const res = await commitImportSession(orgId, sessionId, { simulate: isDemoOrg(orgId) });

  if (res.ok && !res.simulated) {
    revalidatePath("/dashboard/overview");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/procurement");
    revalidatePath("/dashboard/suppliers");
    revalidatePath("/dashboard/warehouses");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/dashboard/forecast-accuracy");
    revalidatePath("/dashboard/settings");
  }

  return res;
}

export async function saveOrgMappingAction(headersSignature: string, mappings: SheetMapping[]) {
  const orgId = await requireOrgId();
  if (isDemoOrg(orgId)) {
    return { success: true };
  }
  await saveOrgImportMapping(orgId, headersSignature, mappings);
  return { success: true };
}

export async function getOrgMappingAction(headersSignature: string) {
  const orgId = await requireOrgId();
  const mapping = await getOrgImportMapping(orgId, headersSignature);
  return { success: true, mapping };
}
