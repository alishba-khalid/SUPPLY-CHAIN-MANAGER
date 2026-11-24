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
  // Inventory and stock (2026-11-24)
  "lead-time-demand": "lead-time",
  "lead-time-variability": "lead-time",
  "minimum-order-quantity": "economic-order-quantity",
  "quantity-break": "economic-order-quantity",
  "ordering-cost": "economic-order-quantity",
  "periodic-review-system": "min-max-inventory",
  "continuous-review-system": "min-max-inventory",
  "perfect-order-rate": "fill-rate",
  backorder: "stockout",
  "lost-sales": "stockout",
  "stockout-cost": "stockout",
  "pipeline-inventory": "cycle-stock",
  "anticipation-inventory": "cycle-stock",
  "multi-echelon-inventory": "cycle-stock",
  "xyz-analysis": "abc-analysis",
  "sku-rationalization": "abc-analysis",
  "unit-of-measure": "sku",
  "available-inventory": "quantity-on-hand",
  "allocated-inventory": "quantity-on-hand",
  "inventory-position": "quantity-on-hand",
  "consignment-inventory": "vendor-managed-inventory",
  // Purchasing (2026-11-24)
  "purchase-requisition": "purchase-order",
  "blanket-purchase-order": "purchase-order",
  "po-cycle-time": "purchase-order",
  "goods-receipt": "three-way-match",
  "advance-shipping-notice": "three-way-match",
  expediting: "on-time-delivery-rate",
  "spend-analysis": "request-for-quote",
  "landed-cost": "total-cost-of-ownership",
  "purchase-price-variance": "total-cost-of-ownership",
  "back-to-back-order": "drop-shipment",
  // Warehouse (2026-11-24)
  "bin-location": "putaway",
  slotting: "putaway",
  "dock-to-stock-time": "putaway",
  kitting: "order-picking",
  "order-cycle-time": "order-picking",
  "less-than-truckload": "third-party-logistics",
  "cross-docking": "third-party-logistics",
  "physical-inventory-count": "cycle-counting",
  "inventory-accuracy": "cycle-counting",
  "serialized-inventory": "lot-tracking",
  fefo: "lot-tracking",
  // Finance (2026-11-24)
  "days-inventory-outstanding": "inventory-turnover",
  "sell-through-rate": "inventory-turnover",
  "stock-to-sales-ratio": "inventory-turnover",
  lifo: "fifo",
  "weighted-average-cost": "fifo",
  "open-to-buy": "gmroi",
  "payment-terms": "cash-to-cash-cycle",
};

/** Glossary terms whose topic a blog guide already covers in depth. */
export const GLOSSARY_TO_BLOG: Record<string, string> = {
  "slow-moving-inventory": "/blog/overstock-vs-dead-stock",
  "obsolete-inventory": "/blog/overstock-vs-dead-stock",
  "safety-time": "/blog/safety-stock-formula",
};

export function resolveGlossarySlug(slug: string): string {
  return GLOSSARY_MERGED[slug] ?? slug;
}

/** Where a link to this glossary slug should point. */
export function glossaryHref(slug: string): string {
  return GLOSSARY_TO_BLOG[slug] ?? `/glossary/${resolveGlossarySlug(slug)}`;
}
