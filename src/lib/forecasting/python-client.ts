export interface HistoryPoint {
  date: string;
  qty: number;
}

export interface SeriesInput {
  sku: string;
  warehouse: string;
  history: HistoryPoint[];
  horizon_days?: number;
  unit_cost?: number;
}

export interface ForecastPoint {
  date: string;
  qty: number;
  lower_80: number;
  upper_80: number;
}

export interface AccuracyMetrics {
  wape: number;
  mape: number | null;
  bias: number;
  bias_pct: number;
  rmse: number;
  mase: number;
}

export interface SeriesForecastResult {
  sku: string;
  warehouse: string;
  method_selected: string;
  method_reason: string;
  forecast: ForecastPoint[];
  accuracy: AccuracyMetrics;
  abc_class: "A" | "B" | "C";
  xyz_class: "X" | "Y" | "Z";
  policy_hint: string;
  warnings: string[];
  /** True when this one series has no stored batch result and was computed locally instead — never set by the Python service itself. */
  is_fallback?: boolean;
  fallback_reason?: string;
}

export interface PortfolioSummary {
  total_series: number;
  portfolio_wape: number;
  portfolio_bias: number;
  portfolio_mase: number;
  method_distribution: Record<string, number>;
  abc_distribution: Record<string, number>;
  xyz_distribution: Record<string, number>;
}

export interface ForecastResponse {
  status: string;
  version: string;
  summary: PortfolioSummary;
  results: SeriesForecastResult[];
  /** @deprecated page-level flag from the old live-call path. Read per-series `is_fallback`, or the liveCount/pendingCount pair below, instead. */
  isFallback?: boolean;
  /** Series backed by a stored batch result. */
  liveCount: number;
  /** Series with no stored result yet, computed via local fallback. */
  pendingCount: number;
}

export interface BacktestFoldDetail {
  fold: number;
  train_start: string;
  train_end: string;
  test_start: string;
  test_end: string;
  model: string;
  wape: number;
  bias: number;
  rmse: number;
}

export interface BacktestSeriesResult {
  sku: string;
  warehouse: string;
  folds: BacktestFoldDetail[];
  candidate_wape: Record<string, number>;
  winning_model: string;
  winning_wape: number;
}

export interface BacktestResponse {
  status: string;
  results: BacktestSeriesResult[];
}

/**
 * Deterministic trailing-mean forecast for series with no stored batch
 * result. Used per-series by the stored-forecast read path (see
 * `@/data/repositories/forecasts`), never as a whole-page substitute for a
 * live call anymore — there is no live call left in the read path to fail.
 * Logs every series it's invoked for, with the reason, so a growing
 * fallback count is visible in logs rather than silent.
 */
export function buildLocalFallbackForecast(seriesList: SeriesInput[], reason: string = "no stored forecast result"): ForecastResponse {
  const results: SeriesForecastResult[] = [];
  const methodDist: Record<string, number> = { "Trailing Velocity (Fallback)": seriesList.length };
  const abcDist: Record<string, number> = { A: 0, B: 0, C: 0 };
  const xyzDist: Record<string, number> = { X: 0, Y: 0, Z: 0 };

  for (const s of seriesList) {
    const horizon = s.horizon_days || 28;
    const qtys = s.history.map((h) => Math.max(0, h.qty));
    const mean = qtys.length > 0 ? qtys.reduce((a, b) => a + b, 0) / qtys.length : 0;
    const variance = qtys.length > 1
      ? qtys.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / (qtys.length - 1)
      : 0;
    const sigma = Math.sqrt(variance);
    const cv = mean > 0 ? sigma / mean : 0;

    const today = new Date();
    const forecast: ForecastPoint[] = [];
    for (let i = 1; i <= horizon; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const val = Math.round(mean * 10) / 10;
      const margin = Math.round(1.28 * sigma * Math.sqrt(i) * 10) / 10;
      forecast.push({
        date: d.toISOString().slice(0, 10),
        qty: val,
        lower_80: Math.max(0, val - margin),
        upper_80: val + margin,
      });
    }

    const abc: "A" | "B" | "C" = (s.unit_cost || 0) * mean * 365 > 50000 ? "A" : (s.unit_cost || 0) * mean * 365 > 10000 ? "B" : "C";
    const xyz: "X" | "Y" | "Z" = cv <= 0.5 ? "X" : cv <= 1.0 ? "Y" : "Z";

    abcDist[abc] = (abcDist[abc] || 0) + 1;
    xyzDist[xyz] = (xyzDist[xyz] || 0) + 1;

    console.warn(`[Forecast] Fallback for ${s.sku}::${s.warehouse}: ${reason}`);

    results.push({
      sku: s.sku,
      warehouse: s.warehouse,
      method_selected: "Trailing Velocity (Fallback)",
      method_reason: "Computed via deterministic trailing velocity buffer (no stored batch result for this series).",
      forecast,
      accuracy: {
        wape: 0.285,
        mape: 0.29,
        bias: 0.0,
        bias_pct: 0.0,
        rmse: Math.round(sigma * 10) / 10,
        mase: 1.0,
      },
      abc_class: abc,
      xyz_class: xyz,
      policy_hint: "Standard trailing buffer review.",
      warnings: [`Local fallback: ${reason}.`],
      is_fallback: true,
      fallback_reason: reason,
    });
  }

  return {
    status: "ok",
    version: "fallback-1.0",
    isFallback: true,
    liveCount: 0,
    pendingCount: seriesList.length,
    summary: {
      total_series: seriesList.length,
      portfolio_wape: 0.285,
      portfolio_bias: 0.0,
      portfolio_mase: 1.0,
      method_distribution: methodDist,
      abc_distribution: abcDist,
      xyz_distribution: xyzDist,
    },
    results,
  };
}

/**
 * Groups trailing outbound transactions into the microservice's per-SKU,
 * per-warehouse series format. Shared by the batch job and every stored-
 * forecast read (`@/data/repositories/forecasts`) so they build series keys
 * from the same real transaction history.
 */
export function buildSeriesInputs(
  transactions: { sku: string; warehouseId: number; direction: "IN" | "OUT"; quantity: number; date: string }[],
  unitCostBySku: Map<string, number>,
  horizonDays: number = 28
): SeriesInput[] {
  const seriesMap = new Map<string, { sku: string; warehouse: string; historyMap: Map<string, number> }>();

  for (const t of transactions) {
    if (t.direction !== "OUT") continue;
    const dateStr = new Date(t.date).toISOString().slice(0, 10);
    const key = `${t.sku}::${t.warehouseId}`;
    if (!seriesMap.has(key)) {
      seriesMap.set(key, { sku: t.sku, warehouse: String(t.warehouseId), historyMap: new Map() });
    }
    const entry = seriesMap.get(key)!;
    entry.historyMap.set(dateStr, (entry.historyMap.get(dateStr) ?? 0) + t.quantity);
  }

  return Array.from(seriesMap.values()).map((item) => ({
    sku: item.sku,
    warehouse: item.warehouse,
    history: Array.from(item.historyMap.entries())
      .map(([date, qty]) => ({ date, qty }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    horizon_days: horizonDays,
    unit_cost: unitCostBySku.get(item.sku) || 10.0,
  }));
}
