/**
 * TEMPORARY — delete before merging fix-warehouse-capacity-unknown.
 *
 * One-off check of which database the Preview deployment points at and
 * whether the warehouse_capacity_nullable migration is applied there.
 * Returns hosts only (never connection strings, credentials or other env
 * vars) and 404s on Production.
 */
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

const CAPACITY_MIGRATION = "20260925150000_warehouse_capacity_nullable";

function hostOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return "(unparseable)";
  }
}

export async function GET() {
  await connection();
  if (process.env.VERCEL_ENV === "production") return new Response(null, { status: 404 });

  const base = {
    vercelEnv: process.env.VERCEL_ENV ?? null,
    directUrlHost: hostOf(process.env.DIRECT_URL),
    databaseUrlHost: hostOf(process.env.DATABASE_URL),
  };

  try {
    const migrations = await prisma.$queryRaw<{ finished_at: Date | null }[]>`
      SELECT finished_at FROM "_prisma_migrations"
      WHERE migration_name = ${CAPACITY_MIGRATION} AND rolled_back_at IS NULL`;
    const [counts] = await prisma.$queryRaw<{ total: number; zero: number; null: number; fiftyK: number }[]>`
      SELECT count(*)::int AS "total",
             count(*) FILTER (WHERE capacity_units = 0)::int AS "zero",
             count(*) FILTER (WHERE capacity_units IS NULL)::int AS "null",
             count(*) FILTER (WHERE capacity_units = 50000)::int AS "fiftyK"
      FROM "warehouses"`;
    const finishedAt = migrations[0]?.finished_at ?? null;

    return Response.json({
      ...base,
      capacityMigration: { applied: finishedAt !== null, finishedAt },
      warehouseCapacity: counts,
    });
  } catch {
    // Raw driver errors can include connection details; never pass them through.
    return Response.json({ ...base, error: "db query failed" }, { status: 500 });
  }
}
