import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Best-effort caller identity for public, unauthenticated endpoints (demo
 * mode has no user session to key off). Vercel sets x-forwarded-for /
 * x-real-ip on every request; "unknown" only happens off-platform (e.g.
 * local curl without a proxy), where it still limits by falling back to a
 * single shared bucket rather than not limiting at all.
 */
export async function getRequestIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window rate limit backed by Postgres so it holds across serverless
 * instances and cold starts (an in-memory counter does not — every
 * invocation can land on a different instance). Atomic via a single
 * INSERT ... ON CONFLICT DO UPDATE ... RETURNING, so concurrent requests
 * racing the same key still get a correct count.
 *
 * `key` should already encode both the scope (what's being limited) and the
 * identity (IP, org, "global") — this function only adds the time window.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = Date.now();
  const windowEnds = new Date(Math.ceil(now / windowMs) * windowMs);
  const bucketKey = `${key}:${windowEnds.toISOString()}`;

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit_buckets (key, count, window_ends, updated_at)
    VALUES (${bucketKey}, 1, ${windowEnds}, NOW())
    ON CONFLICT (key) DO UPDATE SET count = rate_limit_buckets.count + 1, updated_at = NOW()
    RETURNING count
  `;

  const count = rows[0]?.count ?? 1;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: windowEnds,
  };
}

/**
 * Per-IP rate limit for expensive SSR pages (forecast/projections — they
 * query transaction history and, on a cache miss, call the paid Python
 * forecasting microservice). `scope` distinguishes independent limits for
 * different pages sharing this helper.
 */
export async function checkPageRateLimit(
  scope: string,
  limit: number = 30,
  windowMs: number = 5 * 60 * 1000
): Promise<boolean> {
  const ip = await getRequestIp();
  const result = await checkRateLimit(`page:${scope}:ip:${ip}`, limit, windowMs);
  return result.allowed;
}
