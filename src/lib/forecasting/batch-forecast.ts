/**
 * The single place that calls the Python forecasting service and writes
 * its output to the `forecast_results` table. Used by the nightly cron
 * (`/api/cron/recompute-forecasts`), the manual "Recompute forecasts"
 * button (`@/app/actions/forecasts`), and the seed script — one source of
 * truth for "how a batch computes and persists results," so cron, button,
 * and seed can never disagree on the write path.
 */
import { upsertForecastResults } from "@/data/repositories/forecasts";
import type { SeriesInput, SeriesForecastResult } from "@/lib/forecasting/python-client";

const FORECAST_URL =
  process.env.FORECAST_SERVICE_URL || process.env.FORECASTING_SERVICE_URL || "http://127.0.0.1:8000";
const FORECAST_SECRET =
  process.env.FORECAST_SERVICE_SECRET || process.env.FORECASTING_SERVICE_SECRET;

/** Sized against the Python tournament's measured ~0.5s/series (in-process) plus real network overhead — see the chat-recorded benchmark. */
export const BATCH_CHUNK_SIZE = 15;
// Generous per-chunk budget; a chunk this size should finish in well under
// 30s even with network overhead, but a cold Python instance shouldn't be
// able to blow past this and hang the whole batch invocation.
const CHUNK_TIMEOUT_MS = 60_000;

/** One network call per chunk — throws on failure. The batch loop below decides whether to skip and continue; this function never silently swallows an error into a fallback. */
async function callForecastService(series: SeriesInput[]): Promise<SeriesForecastResult[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHUNK_TIMEOUT_MS);
  try {
    const res = await fetch(`${FORECAST_URL}/forecast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(FORECAST_SECRET ? { "X-Forecast-Secret": FORECAST_SECRET } : {}),
      },
      body: JSON.stringify({ series }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Forecast service returned HTTP ${res.status}`);
    const data = await res.json();
    return data.results as SeriesForecastResult[];
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface BatchProgress {
  orgId: string;
  total: number;
  processed: number;
  cursor: number;
  done: boolean;
  errors: string[];
}

/**
 * Processes series[startCursor .. ] for one org, one chunk of
 * `BATCH_CHUNK_SIZE` at a time, persisting each chunk immediately (so a
 * crash mid-batch keeps whatever already completed). Stops — without
 * throwing — once either every series is processed or `deadline` passes;
 * the caller decides what to do with an unfinished run (the cron route
 * schedules a continuation, the manual button and seed script don't need
 * to, since their inputs are always small/unbounded-in-time respectively).
 */
export async function runForecastBatch(
  orgId: string,
  seriesList: SeriesInput[],
  startCursor: number = 0,
  deadline: number = Infinity,
): Promise<BatchProgress> {
  let cursor = startCursor;
  let processed = 0;
  const errors: string[] = [];

  while (cursor < seriesList.length && Date.now() < deadline) {
    const chunk = seriesList.slice(cursor, cursor + BATCH_CHUNK_SIZE);
    try {
      const results = await callForecastService(chunk);
      await upsertForecastResults(orgId, results);
      processed += chunk.length;
    } catch (err) {
      errors.push(`[${orgId}] series ${cursor}-${cursor + chunk.length}: ${(err as Error).message}`);
      // One bad chunk shouldn't stall the rest of the org's series.
    }
    cursor += BATCH_CHUNK_SIZE;
  }

  return { orgId, total: seriesList.length, processed, cursor, done: cursor >= seriesList.length, errors };
}
