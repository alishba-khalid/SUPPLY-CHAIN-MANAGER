/**
 * Automatic refresh: download a saved link and run it through the same
 * template import as a manual upload (header check, row rules, transaction
 * keys so re-imports never duplicate the ledger). A refresh never clears
 * existing data — rows removed from the sheet stay in the app.
 * Server-only (uses DNS and the database).
 */
import { lookup } from "node:dns/promises";
import * as XLSX from "xlsx";
import { importData } from "@/data/repositories/import";
import { checkTemplateHeaders, UNREADABLE_FILE_MESSAGE } from "@/lib/importer/template-file-check";
import { EMPTY_TALLY, addTallies, templateResultMessage, withTemplateImportKeys, type TemplateImportTally } from "@/lib/importer/template-import";
import type { TemplateType } from "@/lib/importer/template-rows";
import type { DataSourceProvider } from "@/types/integrations";
import { downloadUrl, isIpLiteral, isPrivateAddress, linkProblem } from "./source-url";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_REDIRECTS = 5;
const BATCH_SIZE = 500;
/** Same ceiling as the public demo / trial import limit. */
const MAX_ROWS = 50_000;

export type SyncResult = { ok: true; rows: number; message: string } | { ok: false; error: string };

async function assertPublicHost(host: string): Promise<void> {
  if (host === "localhost" || isIpLiteral(host)) throw new SyncError("That link points at a local or IP address.");
  const addresses = await lookup(host, { all: true }).catch(() => {
    throw new SyncError(`Couldn't find ${host}. Check the link.`);
  });
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new SyncError("That link points at a private network address.");
  }
}

class SyncError extends Error {}

/** Downloads with redirects checked hop by hop, a timeout and a size cap. */
async function download(startUrl: string): Promise<Uint8Array> {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") throw new SyncError("The link redirected to a non-https address.");
    await assertPublicHost(parsed.hostname);

    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "SupplyChainManager-Refresh/1.0" },
    }).catch((err: unknown) => {
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      throw new SyncError(timedOut ? "The link took too long to respond." : "Couldn't download the file from that link.");
    });

    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) throw new SyncError("The link redirected without saying where to.");
      url = new URL(next, url).toString();
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new SyncError("The file isn't public. Publish it (Google Sheets) or share it with “Anyone with the link” (OneDrive).");
    }
    if (res.status === 404) throw new SyncError("Nothing was found at that link.");
    if (!res.ok) throw new SyncError(`The link returned an error (HTTP ${res.status}).`);

    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) {
      throw new SyncError(
        "The link opened a web page, not a file. For Google Sheets use File → Share → Publish to web → CSV; for OneDrive share with “Anyone with the link”.",
      );
    }
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) throw new SyncError("The file is larger than 10 MB.");

    const reader = res.body?.getReader();
    if (!reader) throw new SyncError("The link returned an empty file.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new SyncError("The file is larger than 10 MB.");
      }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.byteLength;
    }
    return out;
  }
  throw new SyncError("The link redirected too many times.");
}

/** Reads the first sheet the way a manual import does, and checks its headers. */
function readRows(bytes: Uint8Array, type: TemplateType): Record<string, unknown>[] {
  let sheet: XLSX.WorkSheet;
  try {
    const book = XLSX.read(bytes, { type: "array", cellDates: true });
    sheet = book.Sheets[book.SheetNames[0]];
  } catch {
    throw new SyncError(UNREADABLE_FILE_MESSAGE);
  }
  if (!sheet) throw new SyncError("The file has no sheets.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) throw new SyncError("The file is empty.");
  const headers = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? [];
  const headerError = checkTemplateHeaders(type, headers.map(String), { mode: "section", templateButton: "Template CSV" });
  if (headerError) throw new SyncError(headerError);
  if (rows.length > MAX_ROWS) throw new SyncError(`The file has ${rows.length.toLocaleString()} rows; automatic refresh takes up to ${MAX_ROWS.toLocaleString()}.`);
  return rows;
}

async function fetchRows(provider: DataSourceProvider, link: string, type: TemplateType) {
  const problem = linkProblem(provider, link);
  if (problem) throw new SyncError(problem);
  return readRows(await download(downloadUrl(provider, link)), type);
}

/** Downloads and checks the file without saving anything. */
export async function testSource(provider: DataSourceProvider, link: string, type: TemplateType): Promise<SyncResult> {
  try {
    const rows = await fetchRows(provider, link, type);
    return { ok: true, rows: rows.length, message: "The columns match, so this link can be saved." };
  } catch (err) {
    return { ok: false, error: err instanceof SyncError ? err.message : "Couldn't read that link." };
  }
}

/** Downloads the file and imports it into this org (add/update only). */
export async function refreshSource(
  orgId: string,
  provider: DataSourceProvider,
  link: string,
  type: TemplateType,
): Promise<SyncResult> {
  try {
    const parsed = await fetchRows(provider, link, type);
    // Keys are numbered over the whole file, exactly like a manual upload.
    const rows = type === "transactions" ? withTemplateImportKeys(parsed) : parsed;
    let tally: TemplateImportTally = { ...EMPTY_TALLY };
    let rejected = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const res = await importData(orgId, type, batch, { clearExisting: false, firstRowNumber: i + 2 });
      rejected += res.rejected.length;
      if (!res.success) {
        return { ok: false, error: `Stopped at rows ${i + 2}–${i + batch.length + 1}: ${res.error}` };
      }
      tally = addTallies(tally, res.tally);
    }
    return { ok: true, rows: rows.length, message: templateResultMessage(type, tally, rejected) };
  } catch (err) {
    if (err instanceof SyncError) return { ok: false, error: err.message };
    console.error(`[sync] org ${orgId}: refresh failed:`, err instanceof Error ? err.name : "unknown error");
    return { ok: false, error: "The refresh failed unexpectedly. Try again later." };
  }
}
