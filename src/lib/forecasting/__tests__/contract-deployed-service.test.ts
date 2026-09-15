/**
 * Contract test against the DEPLOYED forecasting service — deliberately not
 * a local instance and not a mock. The point is to catch a real production
 * drift: if the Python service's response shape changes and this test
 * doesn't fail, getBatchDemandForecast's try/catch (src/lib/forecasting/
 * python-client.ts) will swallow the mismatch silently and the UI will show
 * fallback numbers with no error — indistinguishable from the service just
 * being slow. This test exists so that failure mode is loud instead.
 *
 * Requires FORECAST_SERVICE_URL and FORECAST_SERVICE_SECRET in the
 * environment (the same values configured on Vercel). Skips — does not
 * fail — when they're absent, so a normal `npm test` stays green for
 * contributors who don't have production secrets; run it deliberately with
 * those two vars set to actually exercise it.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const SERVICE_URL = process.env.FORECAST_SERVICE_URL;
const SERVICE_SECRET = process.env.FORECAST_SERVICE_SECRET;
const RUN = Boolean(SERVICE_URL && SERVICE_SECRET);

const FIXED_SERIES = {
  series: [
    {
      sku: "CONTRACT-TEST-SKU",
      warehouse: "CONTRACT-TEST-WH",
      history: Array.from({ length: 21 }, (_, i) => ({
        date: `2026-05-${String(1 + (i % 28)).padStart(2, "0")}`,
        qty: 10 + (i % 5),
      })),
      horizon_days: 7,
      unit_cost: 10.0,
    },
  ],
};

describe("Contract: deployed forecasting service", { skip: !RUN }, () => {
  test("GET /health returns 200 with a commit marker", async () => {
    const res = await fetch(`${SERVICE_URL}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "healthy");
    assert.ok("commit_sha" in body, "response is missing commit_sha field entirely — deeper drift than an empty value");
    assert.ok(
      body.commit_sha,
      "commit_sha is empty — production was not built from a git push (see README/K2). " +
        "This is a real, currently-open finding, not a flaky test: fix the project's Root " +
        "Directory setting in the Vercel dashboard so git-triggered builds work, then redeploy."
    );
  });

  test("POST /forecast without the secret header is rejected", async () => {
    const res = await fetch(`${SERVICE_URL}/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(FIXED_SERIES),
    });
    assert.equal(res.status, 401);
  });

  test("POST /forecast with the secret returns the shape python-client.ts expects", async () => {
    const res = await fetch(`${SERVICE_URL}/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forecast-Secret": SERVICE_SECRET! },
      body: JSON.stringify(FIXED_SERIES),
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.status, "ok");
    assert.ok(Array.isArray(body.results) && body.results.length === 1);

    const result = body.results[0];
    // Mirrors SeriesForecastResult in src/lib/forecasting/python-client.ts —
    // a field renamed, retyped, or removed on the Python side fails here,
    // not silently at the fallback boundary three files away.
    assert.equal(typeof result.sku, "string");
    assert.equal(typeof result.warehouse, "string");
    assert.equal(typeof result.method_selected, "string");
    assert.equal(typeof result.method_reason, "string");
    assert.ok(["A", "B", "C"].includes(result.abc_class));
    assert.ok(["X", "Y", "Z"].includes(result.xyz_class));
    assert.equal(typeof result.policy_hint, "string");
    assert.ok(Array.isArray(result.warnings));

    assert.ok(Array.isArray(result.forecast) && result.forecast.length === 7);
    for (const point of result.forecast) {
      assert.equal(typeof point.date, "string");
      assert.equal(typeof point.qty, "number");
      assert.equal(typeof point.lower_80, "number");
      assert.equal(typeof point.upper_80, "number");
    }

    const acc = result.accuracy;
    assert.equal(typeof acc.wape, "number");
    assert.equal(typeof acc.bias, "number");
    assert.equal(typeof acc.bias_pct, "number");
    assert.equal(typeof acc.rmse, "number");
    assert.equal(typeof acc.mase, "number");
    assert.ok(acc.mape === null || typeof acc.mape === "number");

    assert.ok(typeof body.summary.portfolio_wape === "number");
    assert.ok(typeof body.summary.method_distribution === "object");
  });
});

if (!RUN) {
  test("Contract: deployed forecasting service (skipped — set FORECAST_SERVICE_URL/FORECAST_SERVICE_SECRET to run for real)", () => {});
}
