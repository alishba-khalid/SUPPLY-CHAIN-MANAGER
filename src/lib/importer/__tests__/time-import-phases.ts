/**
 * Times each phase of a 21,586-row chunked import and counts the database
 * round trips the commit makes (from Prisma's query events — every SQL
 * statement sent, not an estimate). Throwaway DB only:
 *   TEST_DATABASE_URL=... npx tsx src/lib/importer/__tests__/time-import-phases.ts
 */
export {};

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("set TEST_DATABASE_URL");
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;

  // src/lib/prisma.ts reuses globalThis.prisma when present — install a
  // client with query events so every statement can be counted.
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@/generated/prisma/client");
  const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 10 }), log: [{ emit: "event", level: "query" }] });
  const queries: { at: number; sql: string }[] = [];
  base.$on("query", (e) => queries.push({ at: performance.now(), sql: e.query }));
  (globalThis as unknown as { prisma: unknown }).prisma = base;

  const { prisma } = await import("@/lib/prisma");
  const { directTransport } = await import("./import-test-helpers");
  const { runChunkedImport } = await import("../chunked-upload");
  const { buildImportPayload, ALL_IN_ONE_21586 } = await import("../../../../fixtures/generate-large-import-fixture");

  for (const clearExisting of [false, true]) {
    const orgId = `org_timing_${clearExisting ? "replace" : "merge"}_${Date.now().toString(36)}`;
    const marks: [string, number][] = [];
    const mark = (label: string) => marks.push([label, performance.now()]);
    const t = directTransport(orgId, { onStep: (s) => void mark(s) });
    let stagingStart = 0;
    const res = await runChunkedImport(buildImportPayload(ALL_IN_ONE_21586), clearExisting, {
      ...t,
      stage: async (s, i, rows) => {
        if (i === 0) stagingStart = performance.now();
        return t.stage(s, i, rows);
      },
      commit: async (s) => {
        mark("commit start");
        const r = await t.commit(s);
        mark("commit end");
        return r;
      },
    });
    if (!res.ok) throw new Error(res.error);

    const at = (label: string) => marks.find(([l]) => l === label)![1];
    const commitStart = at("commit start");
    const commitEnd = at("commit end");
    console.log(`\n===== ${clearExisting ? "REPLACE" : "MERGE"} mode, 21,586 rows — ${JSON.stringify(res.counts)} =====`);
    console.log(`staging, 11 requests            ${((commitStart - stagingStart) / 1000).toFixed(2)} s`);
    const phases = marks.filter(([l]) => l !== "commit start" && l !== "commit end");
    console.log(`commit: pre-checks + claim      ${((phases[0][1] - commitStart) / 1000).toFixed(2)} s`);
    for (let i = 0; i < phases.length; i++) {
      const end = i + 1 < phases.length ? phases[i + 1][1] : commitEnd;
      console.log(`commit: ${phases[i][0].padEnd(24)} ${((end - phases[i][1]) / 1000).toFixed(2)} s${i + 1 === phases.length ? "  (incl. COMMIT + session cleanup)" : ""}`);
    }
    console.log(`COMMIT TOTAL                    ${((commitEnd - commitStart) / 1000).toFixed(2)} s`);

    const commitQueries = queries.filter((q) => q.at >= commitStart && q.at <= commitEnd);
    console.log(`database round trips during commit: ${commitQueries.length}`);
    for (const q of commitQueries) console.log(`   ${q.sql.replace(/\s+/g, " ").slice(0, 90)}`);

    for (const m of ["transaction", "purchaseOrder", "inventory", "product", "supplier", "warehouse"] as const) {
      await (prisma[m] as unknown as { deleteMany: (a: object) => Promise<unknown> }).deleteMany({ where: { orgId } });
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
