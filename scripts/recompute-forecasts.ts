/**
 * Nightly forecast recompute for every org, run by
 * .github/workflows/forecasts.yml. The Python forecasting service has no
 * free always-on host, so the workflow starts it inside the runner and this
 * script runs the same batch as /api/cron/recompute-forecasts against it —
 * without that route's per-request time limit.
 *
 *   FORECAST_SERVICE_URL=http://127.0.0.1:8000 npx tsx scripts/recompute-forecasts.ts
 */
import { getInventoryTransactions } from "../src/data/repositories/inventory";
import { getProducts } from "../src/data/repositories/products";
import { getAllOrgIdsWithData } from "../src/data/repositories/forecasts";
import { buildSeriesInputs } from "../src/lib/forecasting/python-client";
import { runForecastBatch } from "../src/lib/forecasting/batch-forecast";

async function main() {
  const orgIds = await getAllOrgIdsWithData();
  let failedOrgs = 0;

  for (const orgId of orgIds) {
    const [transactions, products] = await Promise.all([getInventoryTransactions(orgId), getProducts(orgId)]);
    const unitCostBySku = new Map(products.map((p) => [p.sku, p.unitCost]));
    const seriesList = buildSeriesInputs(transactions, unitCostBySku);

    const progress = await runForecastBatch(orgId, seriesList);
    console.log(`${orgId}: ${progress.processed}/${progress.total} series computed`);
    if (progress.errors.length > 0) {
      failedOrgs++;
      for (const e of progress.errors) console.error(e);
    }
  }

  // Non-zero exit so the workflow run shows as failed and GitHub emails.
  if (failedOrgs > 0) throw new Error(`${failedOrgs} of ${orgIds.length} org(s) had forecast errors — see above.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
