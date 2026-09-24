/**
 * Browser-side driver for the chunked smart import: begin -> stage each
 * chunk -> commit. The server calls are injected (`ImportTransport`) so the
 * same loop runs against server actions in the app and against the
 * repository directly in tests.
 *
 * A thrown call (network drop, server restart) is retried with backoff; after
 * each failure it asks the server which chunks it already confirmed and
 * resumes from there instead of starting over. A returned `{ ok: false }` is
 * a real answer (bad row, limit, expired session) and is never retried.
 */
import {
  buildChunks,
  fingerprintChunks,
  flattenPayload,
  type BeginResult,
  type CommitResult,
  type ImportCounts,
  type StageResult,
  type StagedRow,
  type StatusResult,
} from "./chunked-import";
import type { ImportCommitPayload } from "./types";

export interface ImportTransport {
  begin(input: { fingerprint: string; totalRows: number; totalChunks: number; clearExisting: boolean }): Promise<BeginResult>;
  stage(sessionId: string, chunkIndex: number, rows: StagedRow[]): Promise<StageResult>;
  status(sessionId: string): Promise<StatusResult>;
  commit(sessionId: string): Promise<CommitResult>;
  cancel(sessionId: string): Promise<void>;
}

export type UploadPhase = "preparing" | "uploading" | "saving";

export interface UploadProgress {
  phase: UploadPhase;
  rowsSent: number;
  totalRows: number;
  chunksSent: number;
  totalChunks: number;
  /** Set while waiting to retry after a dropped connection. */
  reconnecting?: { attempt: number; maxAttempts: number };
  resumed?: boolean;
}

export type ChunkedImportResult =
  | { ok: true; counts: ImportCounts; duplicateTransactionsSkipped: number; simulated: boolean }
  | { ok: false; error: string; limitExceeded?: { rows: number; limit: number }; cancelled?: boolean };

const DEFAULT_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000];

class Cancelled extends Error {}

export async function runChunkedImport(
  payload: Omit<ImportCommitPayload, "skuDuplicateResolution" | "clearExisting">,
  clearExisting: boolean,
  transport: ImportTransport,
  opts: {
    onProgress?: (p: UploadProgress) => void;
    signal?: AbortSignal;
    retryDelaysMs?: number[];
    chunkMaxRows?: number;
  } = {}
): Promise<ChunkedImportResult> {
  const retryDelays = opts.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const signal = opts.signal;
  const throwIfCancelled = () => {
    if (signal?.aborted) throw new Cancelled();
  };
  const wait = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener("abort", () => (clearTimeout(timer), reject(new Cancelled())), { once: true });
    });

  const rows = flattenPayload(payload);
  const chunks = buildChunks(rows, opts.chunkMaxRows);
  const totalRows = rows.length;
  const totalChunks = chunks.length;
  let sessionId: string | null = null;
  let resumed = false;

  const progress = (p: Omit<UploadProgress, "totalRows" | "totalChunks" | "resumed">) =>
    opts.onProgress?.({ ...p, totalRows, totalChunks, resumed });

  try {
    progress({ phase: "preparing", rowsSent: 0, chunksSent: 0 });
    if (totalRows === 0) return { ok: false, error: "There are no rows to import." };

    const fingerprint = await fingerprintChunks(chunks, clearExisting);
    throwIfCancelled();

    // begin — retried like any other call; resuming is safe because the
    // server matches on the fingerprint.
    const begin = await withRetry(() => transport.begin({ fingerprint, totalRows, totalChunks, clearExisting }));
    if (!begin.ok) return begin;
    sessionId = begin.sessionId;
    resumed = begin.resumed;

    let received = new Set(begin.receivedChunks);
    const rowsIn = (set: Set<number>) => chunks.reduce((n, c) => n + (set.has(c.index) ? c.rows.length : 0), 0);
    progress({ phase: "uploading", rowsSent: rowsIn(received), chunksSent: received.size });

    let failures = 0;
    while (received.size < totalChunks) {
      try {
        for (const chunk of chunks) {
          if (received.has(chunk.index)) continue;
          throwIfCancelled();
          const res = await transport.stage(sessionId, chunk.index, chunk.rows);
          if (!res.ok) return res;
          received.add(chunk.index);
          failures = 0;
          progress({ phase: "uploading", rowsSent: rowsIn(received), chunksSent: received.size });
        }
      } catch (err) {
        if (err instanceof Cancelled || signal?.aborted) throw new Cancelled();
        failures++;
        if (failures > retryDelays.length) {
          const next = chunks.find((c) => !received.has(c.index))!;
          return {
            ok: false,
            error: `Connection lost while uploading chunk ${next.index + 1} of ${totalChunks}. The ${received.size} chunk${received.size === 1 ? "" : "s"} already uploaded are kept for 24 hours — choose the same file and import again to resume from chunk ${next.index + 1}.`,
          };
        }
        progress({
          phase: "uploading",
          rowsSent: rowsIn(received),
          chunksSent: received.size,
          reconnecting: { attempt: failures, maxAttempts: retryDelays.length },
        });
        await wait(retryDelays[failures - 1]);
        // Resume from what the server actually confirmed (a chunk may have
        // landed even though its response was lost).
        try {
          const status = await transport.status(sessionId);
          if (!status.ok) return status;
          received = new Set(status.receivedChunks);
        } catch {
          // Still offline — the next loop iteration fails again and backs off.
        }
      }
    }

    throwIfCancelled();
    progress({ phase: "saving", rowsSent: totalRows, chunksSent: totalChunks });
    let commit: CommitResult;
    try {
      commit = await transport.commit(sessionId);
    } catch {
      // Not retried blindly: the commit may have finished before the
      // response was lost. Re-importing is safe either way (idempotent).
      return {
        ok: false,
        error:
          "Connection lost while saving. The import either finished or was fully rolled back — never half-applied. Check your data; importing the same file again will not create duplicates.",
      };
    }
    return commit;
  } catch (err) {
    if (err instanceof Cancelled) {
      if (sessionId) await transport.cancel(sessionId).catch(() => {});
      return { ok: false, cancelled: true, error: "Import cancelled. Nothing was saved." };
    }
    return { ok: false, error: `Upload failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      throwIfCancelled();
      try {
        return await fn();
      } catch (err) {
        if (attempt >= retryDelays.length) throw err;
        await wait(retryDelays[attempt]);
      }
    }
  }
}
