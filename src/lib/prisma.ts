import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Standard Next.js dev-mode singleton: without this, every hot-reload of a
 * module that imports this file would open a new connection pool, quickly
 * exhausting the local Postgres server's connection limit.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  extendedPrisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
const adapter = new PrismaPg({ connectionString, max: 10 });
const basePrisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

/**
 * The local `prisma dev` proxy intermittently drops an idle connection
 * ("Server has closed the connection" / P1017 / ConnectionClosed).
 * Transparently retry transient connection failures with backoff.
 */
export const prisma =
  globalForPrisma.extendedPrisma ??
  (basePrisma.$extends({
    query: {
      async $allOperations({ query, args }) {
        const maxAttempts = 6;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await query(args);
          } catch (error: unknown) {
            const err = error as { message?: string; code?: string; meta?: { driverAdapterError?: unknown } };
            const msg = `${err?.message || ""} ${err?.code || ""} ${String(err?.meta?.driverAdapterError || "")} ${String(error)}`;
            const isTransient =
              msg.includes("Connection terminated") ||
              msg.includes("ConnectionClosed") ||
              msg.includes("P1017") ||
              msg.includes("Server has closed the connection") ||
              msg.includes("ECONNRESET") ||
              msg.includes("closed the connection") ||
              err?.code === "P1017" ||
              err?.code === "P2010";

            if (!isTransient || attempt === maxAttempts) throw error;
            await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
          }
        }
        throw new Error("unreachable");
      },
    },
  }) as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.extendedPrisma = prisma;
}
