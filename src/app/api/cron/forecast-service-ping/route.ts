/**
 * Cheap once-daily log-only check that the Python service is up (Vercel
 * Hobby cron can't run more often than daily — see vercel.json). This is
 * NOT the real uptime ping: set up an external monitor (cron-job.org,
 * UptimeRobot, etc.) against GET /health on a short interval for that —
 * this route only gives you one data point a day in the Vercel logs.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = process.env.FORECAST_SERVICE_URL || process.env.FORECASTING_SERVICE_URL;
  if (!url) return Response.json({ ok: false, reason: "FORECAST_SERVICE_URL not set" });

  try {
    const res = await fetch(`${url}/health`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) console.error(`[forecast-service-ping] /health returned ${res.status}`);
    return Response.json({ ok: res.ok, status: res.status, body });
  } catch (err) {
    console.error("[forecast-service-ping] unreachable:", (err as Error).message);
    return Response.json({ ok: false, error: (err as Error).message });
  }
}
