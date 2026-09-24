/**
 * Stages a 21,586-row upload, then runs every commit statement (the exact
 * referenceCheckSql / COMMIT_STATEMENTS the app uses) under
 * EXPLAIN (ANALYZE, BUFFERS) inside one transaction that is rolled back, and
 * prints the plan of the slowest. Throwaway DB only:
 *   TEST_DATABASE_URL=... npx tsx src/lib/importer/__tests__/probe-explain-commit.ts
 */
export {};

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("set TEST_DATABASE_URL");
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
  const { prisma } = await import("@/lib/prisma");
  const { COMMIT_STATEMENTS, referenceCheckSql } = await import("@/data/repositories/import-staging");
  const { directTransport } = await import("./import-test-helpers");
  const { runChunkedImport } = await import("../chunked-upload");
  const { buildImportPayload, ALL_IN_ONE_21586 } = await import("../../../../fixtures/generate-large-import-fixture");

  const orgId = `org_probe_explain_${Date.now().toString(36)}`;
  let sessionId = "";
  const base = directTransport(orgId);
  await runChunkedImport(buildImportPayload(ALL_IN_ONE_21586), true, {
    ...base,
    commit: async (s) => {
      sessionId = s; // staged; stop before the real commit
      return { ok: false, error: "stopped before commit" };
    },
  });
  if (!sessionId) throw new Error("staging failed");

  const statements = [
    { label: "validate (all references)", sql: referenceCheckSql(true) },
    ...COMMIT_STATEMENTS.map((st) => ({ label: `write ${st.step}`, sql: st.sql })),
  ];

  const results: { label: string; ms: number; plan: string; sql: string }[] = [];
  class Rollback extends Error {}
  try {
    await prisma.$transaction(
      async (tx) => {
        for (const st of statements) {
          const rows = await tx.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(`EXPLAIN (ANALYZE, BUFFERS) ${st.sql}`, orgId, sessionId);
          const plan = rows.map((r) => r["QUERY PLAN"]).join("\n");
          results.push({ label: st.label, ms: Number(/Execution Time: ([\d.]+) ms/.exec(plan)?.[1] ?? NaN), plan, sql: st.sql });
        }
        throw new Rollback(); // EXPLAIN ANALYZE really executes the writes — undo them
      },
      { timeout: 280_000, maxWait: 20_000 }
    );
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }

  console.log("=== Server-side execution time per statement (EXPLAIN ANALYZE) ===");
  for (const r of results) console.log(`${r.label.padEnd(28)} ${(r.ms / 1000).toFixed(3)} s`);
  const slowest = results.reduce((a, b) => (b.ms > a.ms ? b : a));
  console.log(`\n=== Slowest: ${slowest.label} ===\n${slowest.sql}\n\n${slowest.plan}`);

  await prisma.importSession.deleteMany({ where: { orgId } });
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
