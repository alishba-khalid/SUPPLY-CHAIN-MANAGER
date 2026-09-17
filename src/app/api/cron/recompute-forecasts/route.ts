/**
 * Nightly batch entry point (see vercel.json's `crons` array). Also the
 * self-continuation target when one org's series don't finish inside a
 * single invocation's time budget — see the `after()` call below.
 */
import { after } from "next/server";
import { runForecastBatch } from "@/lib/forecasting/batch-forecast";
import { buildSeriesInputs } from "@/lib/forecasting/python-client";
import { getInventoryTransactions } from "@/data/repositories/inventory";
import { getProducts } from "@/data/repositories/products";
import { getAllOrgIdsWithData } from "@/data/repositories/forecasts";

// Hobby's hard ceiling (also the default) — see functions/limitations.
export const maxDuration = 300;
// Leaves a 30s/10% margin inside maxDuration for the response to actually
// return before Vercel would kill the invocation.
const SOFT_DEADLINE_MS = 270_000;

function isAuthorized(req: Request): boolean {
  // Vercel attaches this header automatically to Cron-triggered requests
  // once CRON_SECRET is set as a project env var; same check authorizes a
  // manual curl for testing.
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const onlyOrgId = url.searchParams.get("org");
  const startCursor = Number(url.searchParams.get("cursor") || 0);
  const deadline = Date.now() + SOFT_DEADLINE_MS;

  const orgIds = onlyOrgId ? [onlyOrgId] : await getAllOrgIdsWithData();

  const results = [];
  for (const orgId of orgIds) {
    const [transactions, products] = await Promise.all([getInventoryTransactions(orgId), getProducts(orgId)]);
    const unitCostBySku = new Map(products.map((p) => [p.sku, p.unitCost]));
    const seriesList = buildSeriesInputs(transactions, unitCostBySku);

    const progress = await runForecastBatch(orgId, seriesList, onlyOrgId ? startCursor : 0, deadline);
    results.push(progress);

    if (!progress.done) {
      // runForecastBatch only stops early because the deadline passed —
      // schedule the next chunk as a genuinely new invocation rather than
      // truncating this one's work.
      const authHeader = req.headers.get("authorization")!;
      after(() =>
        fetch(`${url.origin}/api/cron/recompute-forecasts?org=${orgId}&cursor=${progress.cursor}`, {
          headers: { authorization: authHeader },
        }).catch((err) => console.error(`[recompute-forecasts] continuation fetch failed for ${orgId}:`, err))
      );
    }
  }

  return Response.json({ ok: true, results, finishedAt: new Date().toISOString() });
}
