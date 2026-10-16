/**
 * On hosts without an always-on forecasting service (Netlify — see
 * .github/workflows/forecasts.yml), "Recompute forecasts" starts the same
 * GitHub Actions job the nightly run uses, scoped to one org. The job takes
 * a few minutes; results land in the database like the nightly run.
 *
 * Needs GITHUB_ACTIONS_TOKEN: a fine-grained token for this repository with
 * "Actions: Read and write" and nothing else. Server-side only.
 */
const REPO = "alishba-khalid/SUPPLY-CHAIN-MANAGER";
const WORKFLOW = "forecasts.yml";
const REF = "master";

export function canDispatchForecastJob(): boolean {
  return Boolean(process.env.GITHUB_ACTIONS_TOKEN);
}

/**
 * True when this deployment has its own forecasting service to call
 * directly. Local dev keeps the old default (a service on 127.0.0.1:8000).
 */
export function hasForecastService(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return Boolean(process.env.FORECAST_SERVICE_URL || process.env.FORECASTING_SERVICE_URL);
}

export async function dispatchForecastJob(orgId: string): Promise<{ ok: true } | { ok: false; status: number }> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_ACTIONS_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref: REF, inputs: { org_id: orgId } }),
  });
  // 204 No Content is success; GitHub returns no run id.
  return res.status === 204 ? { ok: true } : { ok: false, status: res.status };
}
