#!/usr/bin/env node
/**
 * Fails the build if the literal string "PLACEHOLDER" made it into any
 * prerendered static page's HTML output. Added after a page shipped with
 * visible "[PLACEHOLDER: ...]" copy on /about and /security — this is the
 * safety net so that can't happen silently again.
 *
 * Only checks statically prerendered routes (.next/server/app/**\/*.html)
 * since those are the only ones with HTML written to disk at build time;
 * dynamic/SSR routes render per-request and aren't inspectable here.
 */
import fs from "node:fs";
import path from "node:path";

const APP_DIR = path.join(process.cwd(), ".next", "server", "app");

function findHtmlFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      results.push(fullPath);
    }
  }
  return results;
}

const htmlFiles = findHtmlFiles(APP_DIR);
const offenders = [];

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("PLACEHOLDER")) {
    offenders.push(path.relative(process.cwd(), file));
  }
}

if (offenders.length > 0) {
  console.error('\nBuild failed: the string "PLACEHOLDER" was found in rendered HTML output:\n');
  for (const file of offenders) {
    console.error(`  - ${file}`);
  }
  console.error(
    "\nRemove visible placeholder copy from the page (move unresolved facts into a code comment, " +
      "write the section generically, or delete it) before shipping.\n",
  );
  process.exit(1);
}

console.log(`check-no-placeholder: scanned ${htmlFiles.length} prerendered page(s), no "PLACEHOLDER" found.`);
