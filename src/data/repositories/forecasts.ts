/**
 * Read/write access to batch-computed forecast results — the only place
 * the app touches the `forecast_results` table. See
 * `@/lib/forecasting/batch-forecast` for how rows get written, and
 * docs/metrics.md for why forecasting moved to a nightly batch instead of a
 * page-render call to the Python service.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { buildLocalFallbackForecast } from "@/lib/forecasting/python-client";
import type {
  ForecastResponse,
  PortfolioSummary,
  SeriesForecastResult,
  SeriesInput,
} from "@/lib/forecasting/python-client";

type ForecastResultRow = Awaited<ReturnType<typeof prisma.forecastResult.findMany>>[number];

function toSeriesResult(row: ForecastResultRow): SeriesForecastResult {
  return {
    sku: row.sku,
    warehouse: String(row.warehouseId),
    method_selected: row.methodSelected,
    method_reason: row.methodReason,
    forecast: row.forecastJson as unknown as SeriesForecastResult["forecast"],
    accuracy: {
      wape: row.wape,
      mape: row.mape,
      bias: row.bias,
      bias_pct: row.biasPct,
      rmse: row.rmse,
      mase: row.mase,
    },
    abc_class: row.abcClass as "A" | "B" | "C",
    xyz_class: row.xyzClass as "X" | "Y" | "Z",
    policy_hint: row.policyHint,
    warnings: row.warningsJson as unknown as string[],
    is_fallback: false,
  };
}

/** Same aggregation the Python service used to do server-side, now run over whatever mix of stored + per-series-fallback rows a request actually has. */
function summarize(results: SeriesForecastResult[]): PortfolioSummary {
  const n = Math.max(1, results.length);
  const methodDist: Record<string, number> = {};
  const abcDist: Record<string, number> = { A: 0, B: 0, C: 0 };
  const xyzDist: Record<string, number> = { X: 0, Y: 0, Z: 0 };
  let wape = 0, bias = 0, mase = 0;

  for (const r of results) {
    methodDist[r.method_selected] = (methodDist[r.method_selected] ?? 0) + 1;
    abcDist[r.abc_class] = (abcDist[r.abc_class] ?? 0) + 1;
    xyzDist[r.xyz_class] = (xyzDist[r.xyz_class] ?? 0) + 1;
    wape += r.accuracy.wape;
    bias += r.accuracy.bias;
    mase += r.accuracy.mase;
  }

  return {
    total_series: results.length,
    portfolio_wape: Math.round((wape / n) * 10000) / 10000,
    portfolio_bias: Math.round((bias / n) * 100) / 100,
    portfolio_mase: Math.round((mase / n) * 1000) / 1000,
    method_distribution: methodDist,
    abc_distribution: abcDist,
    xyz_distribution: xyzDist,
  };
}

/**
 * The read path every page uses now — zero network calls, zero timeouts.
 * Fallback is decided PER SERIES: a series with a stored batch result reads
 * that result regardless of how many other series in the same request are
 * missing one. `isFallback` (the deprecated whole-page flag) is only true
 * when every requested series is a fallback; callers that want the
 * "live when the majority is live" framing should use `liveCount` /
 * `pendingCount` instead (see `ForecastModeBadge`).
 */
export async function getStoredForecast(orgId: string, seriesList: SeriesInput[]): Promise<ForecastResponse> {
  if (seriesList.length === 0) {
    return { status: "ok", version: "stored-1.0", isFallback: false, liveCount: 0, pendingCount: 0, summary: summarize([]), results: [] };
  }

  const rows = await prisma.forecastResult.findMany({ where: { orgId } });
  const byKey = new Map(rows.map((r) => [`${r.sku}::${r.warehouseId}`, r]));

  const stored: SeriesForecastResult[] = [];
  const missing: SeriesInput[] = [];
  for (const s of seriesList) {
    const row = byKey.get(`${s.sku}::${s.warehouse}`);
    if (row) stored.push(toSeriesResult(row));
    else missing.push(s);
  }

  const fallback =
    missing.length > 0
      ? buildLocalFallbackForecast(missing, "no stored forecast result for this org+series — batch has not run for it yet").results
      : [];

  const results = [...stored, ...fallback];
  return {
    status: "ok",
    version: "stored-1.0",
    isFallback: stored.length === 0, // whole-page fallback only when NOTHING is live
    liveCount: stored.length,
    pendingCount: fallback.length,
    summary: summarize(results),
    results,
  };
}

export async function getLastForecastComputedAt(orgId: string): Promise<Date | null> {
  const latest = await prisma.forecastResult.findFirst({
    where: { orgId },
    orderBy: { computedAt: "desc" },
    select: { computedAt: true },
  });
  return latest?.computedAt ?? null;
}

/** Whether THIS ONE series has a stored result, and when it was computed — used by the single-SKU projection detail page instead of pulling the whole org's rows. */
export async function getStoredForecastMeta(
  orgId: string,
  sku: string,
  warehouseId: number
): Promise<{ isLive: boolean; computedAt: Date | null }> {
  const row = await prisma.forecastResult.findUnique({
    where: { orgId_sku_warehouseId: { orgId, sku, warehouseId } },
    select: { computedAt: true },
  });
  return { isLive: row !== null, computedAt: row?.computedAt ?? null };
}

/** Batch-job write side — upserts one chunk's worth of tournament results. */
export async function upsertForecastResults(orgId: string, results: SeriesForecastResult[]): Promise<void> {
  const computedAt = new Date();
  await prisma.$transaction(
    results.map((r) => {
      const warehouseId = Number(r.warehouse);
      const data = {
        methodSelected: r.method_selected,
        methodReason: r.method_reason,
        forecastJson: r.forecast as unknown as Prisma.InputJsonValue,
        wape: r.accuracy.wape,
        mape: r.accuracy.mape,
        bias: r.accuracy.bias,
        biasPct: r.accuracy.bias_pct,
        rmse: r.accuracy.rmse,
        mase: r.accuracy.mase,
        abcClass: r.abc_class,
        xyzClass: r.xyz_class,
        policyHint: r.policy_hint,
        warningsJson: r.warnings as unknown as Prisma.InputJsonValue,
        computedAt,
      };
      return prisma.forecastResult.upsert({
        where: { orgId_sku_warehouseId: { orgId, sku: r.sku, warehouseId } },
        create: { orgId, sku: r.sku, warehouseId, ...data },
        update: data,
      });
    })
  );
}

/** Every org that has at least one warehouse — the cron route's default (no `?org=` override) processes all of these. */
export async function getAllOrgIdsWithData(): Promise<string[]> {
  const rows = await prisma.warehouse.findMany({ select: { orgId: true }, distinct: ["orgId"] });
  return rows.map((r) => r.orgId);
}
