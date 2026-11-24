/**
 * Glossary terms that were merged into a richer page, mapped to the page that
 * now covers them. The map drives three things: 301 redirects (next.config.ts),
 * link resolution (getTerm and g()), and keeps old links from pointing at a
 * removed URL. Source of truth for the plan: docs/seo/glossary-merge-map.json.
 *
 * Keep this file dependency-free: next.config.ts imports it.
 */
export const GLOSSARY_MERGED: Record<string, string> = {
  // Forecasting (2026-11-24)
  mape: "forecast-accuracy",
  wape: "forecast-accuracy",
  mase: "forecast-accuracy",
  backtesting: "forecast-accuracy",
  "forecast-horizon": "forecast-accuracy",
  "tracking-signal": "forecast-bias",
  "moving-average-forecast": "exponential-smoothing",
  "naive-forecast": "exponential-smoothing",
  "demand-spike": "seasonality",
  "crostons-method": "intermittent-demand",
  "coefficient-of-variation": "intermittent-demand",
  "sales-and-operations-planning": "demand-planning",
};

export function resolveGlossarySlug(slug: string): string {
  return GLOSSARY_MERGED[slug] ?? slug;
}
