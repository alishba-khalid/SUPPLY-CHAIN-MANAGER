"use server";

import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { runForecastBatch } from "@/lib/forecasting/batch-forecast";
import { buildSeriesInputs } from "@/lib/forecasting/python-client";
import { getInventoryTransactions } from "@/data/repositories/inventory";
import { getProducts } from "@/data/repositories/products";
import { revalidatePath } from "next/cache";
import { canDispatchForecastJob, dispatchForecastJob, hasForecastService } from "@/lib/forecasting/github-dispatch";

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

// Without a forecasting service (Netlify), each click starts a GitHub
// Actions run of several minutes, so real orgs get a few a day. The shared
// demo org never dispatches: anonymous visitors must not be able to spend
// the repository's Actions minutes.
const DISPATCH_LIMIT = 3;
const DISPATCH_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function recomputeForecastsAction() {
  const orgId = await requireOrgId();

  if (!hasForecastService()) return queueForecastJob(orgId);

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

/** Recompute via the GitHub Actions forecast job (hosts with no forecasting service). */
async function queueForecastJob(orgId: string) {
  if (isDemoOrg(orgId)) {
    return { success: false, error: "The demo's forecasts refresh automatically every night." };
  }
  if (!canDispatchForecastJob()) {
    return { success: false, error: "On-demand recompute isn't set up on this server. Forecasts refresh every night." };
  }

  const rate = await checkRateLimit(`forecast-dispatch:org:${orgId}`, DISPATCH_LIMIT, DISPATCH_WINDOW_MS);
  if (!rate.allowed) {
    return { success: false, error: "Recompute has already run several times today. Forecasts also refresh every night." };
  }

  const res = await dispatchForecastJob(orgId);
  if (!res.ok) {
    console.error(`[forecasts] GitHub dispatch failed: HTTP ${res.status}`);
    return { success: false, error: "Couldn't start the recompute. Please try again later." };
  }
  return { success: true, queued: true as const };
}
