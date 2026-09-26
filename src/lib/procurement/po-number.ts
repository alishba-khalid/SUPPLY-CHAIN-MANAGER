/**
 * PO numbers for orders the app issues (quick order / suggested PO). Numbers
 * are sequential per workspace — one above the highest existing "PO-<digits>"
 * — so they stay readable ("PO 20490") and continue the workspace's own
 * series. POs are only ever inserted: if two orders race for the same number,
 * the database's unique (org, PO number) rule rejects the second insert and it
 * retries with the next number. An existing PO is never overwritten.
 */

/** Used when a workspace has no "PO-<digits>" numbers yet. */
export const FIRST_PO_NUMBER = 1001;

/** Insert attempts before giving up (only a burst of simultaneous orders would need more than one). */
export const PO_NUMBER_ATTEMPTS = 3;

export function nextPoNumber(highestExisting: number | null): string {
  const next = highestExisting !== null && Number.isSafeInteger(highestExisting) && highestExisting >= 0
    ? highestExisting + 1
    : FIRST_PO_NUMBER;
  return `PO-${next}`;
}

/** Prisma's unique-constraint violation (P2002), i.e. the PO number already exists in this workspace. */
export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

export function duplicatePoNumberMessage(poNumber: string): string {
  return `Purchase order ${poNumber} already exists. Use a different PO number — existing purchase orders are never overwritten.`;
}

/** A duplicate number is retried; any other failure stops with its error. */
export type InsertResult<T> = { ok: true; value: T } | { ok: false; duplicate: true } | { ok: false; duplicate: false; error: string };

/**
 * Picks the next number and inserts; on a duplicate (another order took that
 * number first) re-reads the highest number and tries again.
 */
export async function insertWithNextPoNumber<T>({
  highestExisting,
  insert,
  attempts = PO_NUMBER_ATTEMPTS,
}: {
  highestExisting: () => Promise<number | null>;
  insert: (poNumber: string) => Promise<InsertResult<T>>;
  attempts?: number;
}): Promise<{ ok: true; value: T; poNumber: string } | { ok: false; error: string }> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const poNumber = nextPoNumber(await highestExisting());
    const result = await insert(poNumber);
    if (result.ok) return { ok: true, value: result.value, poNumber };
    if (!result.duplicate) return { ok: false, error: result.error };
  }
  return { ok: false, error: "Couldn't assign a PO number because other orders were being created at the same moment. Please try again." };
}
