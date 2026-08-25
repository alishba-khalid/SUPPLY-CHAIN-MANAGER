import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Standard Next.js dev-mode singleton: without this, every hot-reload of a
 * module that imports this file would open a new connection pool, quickly
 * exhausting the local Postgres server's connection limit.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// A small max pool size — the local dev Postgres proxy is noticeably less
// stable under a large number of concurrent connections.
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL, max: 5 });

const basePrisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

/**
 * The local `prisma dev` proxy intermittently drops a connection mid-query
 * ("Connection terminated unexpectedly" / P1017) — a known rough edge of
 * this local dev server, not an application bug. Transparently retry a
 * transient connection failure a few times before surfacing it.
 */
export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ query, args }) {
      const maxAttempts = 4;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await query(args);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const isTransient = message.includes("Connection terminated") || message.includes("ConnectionClosed") || message.includes("P1017");
          if (!isTransient || attempt === maxAttempts) throw error;
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        }
      }
      // Unreachable — the loop above always returns or throws.
      throw new Error("unreachable");
    },
  },
}) as unknown as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}
