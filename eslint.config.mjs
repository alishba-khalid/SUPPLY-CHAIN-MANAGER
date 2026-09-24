import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Multi-tenant data isolation: every DB read/write must go through the
  // org-scoped repository functions in src/data/repositories/*.ts, which are
  // the only place `orgId` is threaded into every query. This rule makes a
  // direct `@/lib/prisma` import anywhere else a lint error, so the scoped
  // layer can't be bypassed even by accident. See docs/metrics.md's
  // "Multi-tenant data isolation" section.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message: "Direct Prisma access is restricted to src/data/repositories/*.ts. Add or use an org-scoped repository function instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/data/repositories/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  // Tests and benchmarks assert on (and clean up) raw database state across
  // orgs — e.g. "org A's import never appears in org B" has to count org B's
  // rows directly, not through the code under test. They never ship in the
  // app bundle.
  {
    files: ["src/**/__tests__/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
