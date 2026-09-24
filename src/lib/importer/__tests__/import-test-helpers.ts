/**
 * Test/benchmark plumbing for the chunked importer: an ImportTransport that
 * calls the repository directly (what the server actions do, minus Clerk auth
 * and rate limiting). Import this only after DATABASE_URL points at the
 * database you intend to write to.
 */
import {
  beginImportSession,
  cancelImportSession,
  commitImportSession,
  getImportRowLimit,
  getImportSessionStatus,
  stageImportChunk,
  type CommitStep,
} from "@/data/repositories/import-staging";
import { runChunkedImport, type ImportTransport } from "../chunked-upload";
import type { ImportCommitPayload } from "../types";

export function directTransport(
  orgId: string,
  opts: { isDemo?: boolean; onStep?: (step: CommitStep) => void | Promise<void> } = {}
): ImportTransport {
  return {
    begin: async (input) => beginImportSession(orgId, { ...input, rowLimit: await getImportRowLimit(orgId, Boolean(opts.isDemo)) }),
    stage: (sessionId, chunkIndex, rows) => stageImportChunk(orgId, sessionId, chunkIndex, rows),
    status: (sessionId) => getImportSessionStatus(orgId, sessionId),
    commit: (sessionId) => commitImportSession(orgId, sessionId, { simulate: opts.isDemo, onStep: opts.onStep }),
    cancel: (sessionId) => cancelImportSession(orgId, sessionId),
  };
}

export function importPayloadDirect(
  orgId: string,
  payload: Omit<ImportCommitPayload, "skuDuplicateResolution" | "clearExisting">,
  clearExisting: boolean
) {
  return runChunkedImport(payload, clearExisting, directTransport(orgId));
}
