/**
 * All business dates in the mock dataset are calculated relative to this
 * fixed reference date, never the system clock. This guarantees stable
 * overdue status, stable trailing-90-day windows, and reproducible
 * screenshots/tests.
 */
export const REFERENCE_DATE = "2026-08-24";

export function referenceDate(): Date {
  return new Date(`${REFERENCE_DATE}T00:00:00Z`);
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Offset in days from REFERENCE_DATE. Negative = past, positive = future. */
export function offsetDate(days: number): string {
  const d = referenceDate();
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Adds `days` (may be negative) to an arbitrary ISO date string. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((db - da) / 86_400_000);
}

export function isOnOrBefore(a: string, b: string): boolean {
  return a <= b;
}

/** True when `date` falls in (reference - windowDays, reference], inclusive of the reference date. */
export function isWithinTrailingWindow(
  date: string,
  windowDays: number,
  reference: string = REFERENCE_DATE,
): boolean {
  const start = addDays(reference, -windowDays);
  return date > start && date <= reference;
}
