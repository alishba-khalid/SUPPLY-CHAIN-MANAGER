import "dotenv/config";
import { seedCanonicalData } from "./seed-canonical";
import { getInventoryTransactions } from "../src/data/repositories/inventory";
import { getProducts } from "../src/data/repositories/products";
import { buildSeriesInputs } from "../src/lib/forecasting/python-client";
import { runForecastBatch } from "../src/lib/forecasting/batch-forecast";

function parseOrgId(): string {
  const flagIndex = process.argv.indexOf("--org");
  return flagIndex !== -1 && process.argv[flagIndex + 1] ? process.argv[flagIndex + 1] : "org_demo";
}

const ORG_ID = parseOrgId();

async function main() {
  await seedCanonicalData(ORG_ID);

  // Precompute forecast results for every seeded series so a first-time
  // visitor sees live-model numbers immediately — no waiting, no fallback
  // badges. Unlike the cron route, this runs to completion with no time
  // budget: it's a plain script, not a Vercel function.
  console.log("\n--- Precomputing forecast results for seeded series ---");
  const [transactions, products] = await Promise.all([getInventoryTransactions(ORG_ID), getProducts(ORG_ID)]);
  const unitCostBySku = new Map(products.map((p) => [p.sku, p.unitCost]));
  const seriesList = buildSeriesInputs(transactions, unitCostBySku);

  const progress = await runForecastBatch(ORG_ID, seriesList);
  console.log(`Forecast batch: ${progress.processed}/${progress.total} series computed.`);
  if (progress.errors.length > 0) {
    console.error("Forecast batch errors:", progress.errors);
    throw new Error(`Forecast batch had ${progress.errors.length} error(s) — see above. Seed data is in place, but not every series has a stored forecast.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
