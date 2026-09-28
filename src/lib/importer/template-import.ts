/**
 * Repeat-import safety and honest result messages for the 6-file template
 * importer (the per-section "Import …" buttons and 6-File Template Mode).
 * Pure — no server or DOM dependencies — so the browser, the server and the
 * tests share it.
 */
import { transactionImportKeyBase } from "./chunked-import";
import { parseTemplateRows, type TemplateType } from "./template-rows";

/**
 * Row field carrying a transaction's import key from the browser to the
 * server. Not a spreadsheet column, so the row parser never reads it.
 */
export const IMPORT_KEY_FIELD = "__importKey";

/**
 * Adds the import key to each valid transaction row: its content plus its
 * occurrence number among identical rows in the whole file — the same key
 * Smart Import uses. Built here, over the whole file, because the server only
 * sees one batch at a time: numbered per batch, two genuinely identical
 * movements in different batches would both be "#1" and the second would be
 * skipped on the first import. Rows the parser rejects get no key (the server
 * rejects them too).
 */
export function withTemplateImportKeys(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const { records } = parseTemplateRows("transactions", rows, 2);
  const keys = new Map<number, string>();
  const seen = new Map<string, number>();
  for (const { rowNumber, record: t } of records) {
    const base = transactionImportKeyBase({ ...t, date: t.date.toISOString().slice(0, 10) });
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    keys.set(rowNumber - 2, `${base}#${occurrence}`);
  }
  return rows.map((row, i) => (keys.has(i) ? { ...row, [IMPORT_KEY_FIELD]: keys.get(i) } : row));
}

/** The import key the browser attached to a row, if it is one we could have made. */
export function readImportKey(row: Record<string, unknown>): string | null {
  const key = row[IMPORT_KEY_FIELD];
  return typeof key === "string" && key.length > 0 && key.length <= 500 ? key : null;
}

export interface TemplateImportTally {
  added: number;
  updated: number;
  unchanged: number;
  /** Transactions already saved by an earlier import of the same rows. */
  skipped: number;
}

export const EMPTY_TALLY: TemplateImportTally = { added: 0, updated: 0, unchanged: 0, skipped: 0 };

export function addTallies(a: TemplateImportTally, b: Partial<TemplateImportTally>): TemplateImportTally {
  return {
    added: a.added + (b.added ?? 0),
    updated: a.updated + (b.updated ?? 0),
    unchanged: a.unchanged + (b.unchanged ?? 0),
    skipped: a.skipped + (b.skipped ?? 0),
  };
}

/**
 * Counts each incoming record as added, updated or unchanged against what is
 * saved. `existing` is updated as it goes, so a key repeated within the file
 * is compared with its earlier row, as the database would see it.
 */
export function tallyChanges<T>(
  incoming: T[],
  keyOf: (r: T) => string,
  existing: Map<string, T>,
  same: (saved: T, next: T) => boolean
): TemplateImportTally {
  const tally = { ...EMPTY_TALLY };
  for (const r of incoming) {
    const key = keyOf(r);
    const saved = existing.get(key);
    if (!saved) tally.added++;
    else if (same(saved, r)) tally.unchanged++;
    else tally.updated++;
    existing.set(key, r);
  }
  return tally;
}

/** Money compared at the 2 decimals the database stores. */
export const sameMoney = (a: unknown, b: unknown) => Number(a).toFixed(2) === Number(b).toFixed(2);
/** Dates compared by calendar day (the database stores dates only). */
export const sameDay = (a: Date | null, b: Date | null) =>
  a === null || b === null ? a === b : a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

const NOUNS: Record<TemplateType, [singular: string, plural: string]> = {
  warehouses: ["warehouse", "warehouses"],
  suppliers: ["supplier", "suppliers"],
  products: ["product", "products"],
  inventory: ["stock balance", "stock balances"],
  purchase_orders: ["purchase order", "purchase orders"],
  transactions: ["transaction", "transactions"],
};

const n = (x: number) => x.toLocaleString("en-US");
const noun = (type: TemplateType, count: number) => NOUNS[type][count === 1 ? 0 : 1];

/** The message shown after a template import finishes. */
export function templateResultMessage(type: TemplateType, t: TemplateImportTally, rejectedCount: number): string {
  let msg: string;
  if (type === "transactions") {
    const total = t.added + t.skipped;
    if (total > 0 && t.added === 0) {
      msg = `Nothing new: all ${n(total)} ${noun(type, total)} in this file ${total === 1 ? "was" : "were"} already imported, so nothing was added.`;
    } else if (t.skipped > 0) {
      msg = `Saved ${n(t.added)} new ${noun(type, t.added)}. ${n(t.skipped)} ${t.skipped === 1 ? "was" : "were"} already imported earlier and ${t.skipped === 1 ? "was" : "were"} skipped, not added twice.`;
    } else {
      msg = `Saved ${n(t.added)} new ${noun(type, t.added)}.`;
    }
  } else {
    const total = t.added + t.updated + t.unchanged;
    if (total > 0 && total === t.unchanged) {
      msg = `No changes: all ${n(total)} ${noun(type, total)} in this file already match what's saved.`;
    } else {
      const label = NOUNS[type][1];
      msg = `${label[0].toUpperCase()}${label.slice(1)}: ${n(t.added)} added, ${n(t.updated)} updated, ${n(t.unchanged)} unchanged.`;
    }
  }
  if (rejectedCount > 0) {
    msg += ` ${n(rejectedCount)} ${rejectedCount === 1 ? "row was" : "rows were"} rejected (see below).`;
  }
  return msg;
}

/**
 * The message when a batch fails after earlier batches were saved. Earlier
 * batches stay saved (each batch is its own transaction); importing the file
 * again updates them in place or skips them — it never adds them twice.
 */
export function templateStoppedMessage(error: string, batchFirstRow: number, batchLastRow: number): string {
  if (batchFirstRow <= 2) return error;
  return `Stopped in rows ${n(batchFirstRow)}–${n(batchLastRow)}: ${error} Rows 2–${n(batchFirstRow - 1)} were saved. Importing this file again won't add them twice.`;
}
