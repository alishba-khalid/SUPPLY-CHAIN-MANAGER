#!/usr/bin/env node
/**
 * TEMPORARY — remove before merging fix-warehouse-capacity-unknown.
 *
 * Logs which database host the Preview build's env vars point at, and the
 * Prisma migration status on that host. Logs hosts only, never full
 * connection strings or passwords. Does nothing outside Vercel Preview, and
 * never fails the build.
 */
import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "preview") {
  process.exit(0);
}

function hostOf(name) {
  const raw = process.env[name];
  if (!raw) return "(not set)";
  try {
    return new URL(raw).host;
  } catch {
    return "(unparseable)";
  }
}

console.log("[check-db-host] VERCEL_ENV=preview");
console.log(`[check-db-host] DIRECT_URL host:   ${hostOf("DIRECT_URL")}`);
console.log(`[check-db-host] DATABASE_URL host: ${hostOf("DATABASE_URL")}`);

if (!process.env.DIRECT_URL) {
  console.log("[check-db-host] DIRECT_URL not set; skipping migrate status");
  process.exit(0);
}

// prisma.config.ts resolves the datasource as DIRECT_URL || DATABASE_URL, so
// this runs against the DIRECT_URL host logged above.
console.log("[check-db-host] prisma migrate status:");
const result = spawnSync("npx", ["prisma", "migrate", "status"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
for (const line of output.split(/\r?\n/)) {
  if (line.trim()) console.log(`[check-db-host]   ${line}`);
}
console.log(`[check-db-host] migrate status exit code: ${result.status}`);

// migrate status exits non-zero when migrations are pending; that's the
// answer we're after, not a build failure.
process.exit(0);
