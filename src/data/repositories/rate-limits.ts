import { prisma } from "@/lib/prisma";

/**
 * Adds one hit to a fixed-window bucket and returns the bucket's new count.
 * Atomic via a single INSERT ... ON CONFLICT DO UPDATE ... RETURNING, so
 * concurrent requests racing the same key still get a correct count.
 */
export async function incrementRateLimitBucket(bucketKey: string, windowEnds: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit_buckets (key, count, window_ends, updated_at)
    VALUES (${bucketKey}, 1, ${windowEnds}, NOW())
    ON CONFLICT (key) DO UPDATE SET count = rate_limit_buckets.count + 1, updated_at = NOW()
    RETURNING count
  `;
  return rows[0]?.count ?? 1;
}
