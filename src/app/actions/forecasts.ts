"use server";

import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { runForecastBatch } from "@/lib/forecasting/batch-forecast";
import { buildSeriesInputs } from "@/lib/forecasting/python-client";
import { getInventoryTransactions } from "@/data/repositories/inventory";
import { getProducts } from "@/data/repositories/products";
import { revalidatePath } from "next/cache";

// The demo org is shared by every visitor to the public demo — this limit
// throttles the whole demo, not any one visitor, so repeated clicks by
// different people can't pile up concurrent calls to the Python service.
const RECOMPUTE_LIMIT = 5;
const RECOMPUTE_WINDOW_MS = 10 * 60 * 1000;

// The demo button runs the REAL batch (not a simulation — a simulated
// response would defeat the point of a button that exists to demonstrate
// the batch forecaster working), but only against a small subset so it
// stays interactive and can't be used to force-recompute the whole
// org_demo dataset from a public page.
const DEMO_SUBSET_SIZE = 10;

export async function recomputeForecastsAction() {
  const orgId = await requireOrgId();

  const rate = await checkRateLimit(`forecast-recompute:org:${orgId}`, RECOMPUTE_LIMIT, RECOMPUTE_WINDOW_MS);
  if (!rate.allowed) {
    return { success: false, error: "Recompute was run recently — please wait a few minutes and try again." };
  }

  const [transactions, products] = await Promise.all([getInventoryTransactions(orgId), getProducts(orgId)]);
  const unitCostBySku = new Map(products.map((p) => [p.sku, p.unitCost]));
  let seriesList = buildSeriesInputs(transactions, unitCostBySku);

  if (isDemoOrg(orgId)) {
    seriesList = seriesList.slice(0, DEMO_SUBSET_SIZE);
  }

  const progress = await runForecastBatch(orgId, seriesList);

  revalidatePath("/dashboard/overview");
  revalidatePath("/dashboard/forecast-accuracy");
  revalidatePath("/dashboard/projections");
  revalidatePath("/dashboard/inventory");

  return {
    success: progress.errors.length === 0,
    isDemo: isDemoOrg(orgId),
    processed: progress.processed,
    total: progress.total,
    errors: progress.errors,
  };
}
