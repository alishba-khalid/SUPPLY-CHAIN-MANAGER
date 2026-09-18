#!/usr/bin/env node
/**
 * Fetches the ACTUAL deployed HTTP response for a set of routes and fails
 * if "PLACEHOLDER" appears in the body. This exists because
 * check-no-placeholder.mjs (which scans .next/server/app build artifacts)
 * can pass clean while the live site still serves stale/broken content —
 * a build-artifact check can never catch a build-vs-deploy divergence,
 * only an HTTP check against the real deployed URL can.
 *
 * Must be run AFTER a deployment is live (it needs a real URL to hit) —
 * it cannot run as part of `next build`, since no deployment exists yet
 * at build time.
 *
 * Usage:
 *   node scripts/check-live-placeholder.mjs [baseUrl]
 *   LIVE_URL=https://your-domain node scripts/check-live-placeholder.mjs
 */
const baseUrl =
  process.argv[2] || process.env.LIVE_URL || "https://supply-chain-manager-mocha.vercel.app";

const ROUTES = ["/", "/about", "/privacy", "/terms", "/security"];

async function checkRoute(route) {
  const url = `${baseUrl}${route}?livecheck=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
  const body = await res.text();
  const hasPlaceholder = body.includes("PLACEHOLDER");
  return { route, url, status: res.status, hasPlaceholder };
}

const results = await Promise.all(ROUTES.map(checkRoute));

let failed = false;
for (const r of results) {
  const mark = r.hasPlaceholder ? "FAIL" : "ok";
  console.log(`[${mark}] ${r.route} (HTTP ${r.status})${r.hasPlaceholder ? " — contains PLACEHOLDER" : ""}`);
  if (r.hasPlaceholder) failed = true;
}

if (failed) {
  console.error("\ncheck-live-placeholder: FAILED — one or more live routes still serve visible PLACEHOLDER text.");
  process.exit(1);
}

console.log("\ncheck-live-placeholder: all routes clean.");
