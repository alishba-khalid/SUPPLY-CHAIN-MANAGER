import { prisma } from "@/lib/prisma";
import type { SheetMapping } from "@/lib/importer/types";

// The import commit itself lives in ./import-staging.ts (chunked upload + one
// set-based transaction).

/**
 * Saves learned column mappings into PostgreSQL keyed to orgId + signature (I2).
 */
export async function saveOrgImportMapping(
  orgId: string,
  headersSignature: string,
  mappings: SheetMapping[]
): Promise<void> {
  try {
    const mappingJson = JSON.stringify(mappings);
    await prisma.importMapping.upsert({
      where: {
        orgId_headersSignature: {
          orgId,
          headersSignature,
        },
      },
      create: {
        orgId,
        headersSignature,
        mappingJson,
      },
      update: {
        mappingJson,
      },
    });
  } catch (err) {
    console.warn("[saveOrgImportMapping] Could not save mapping:", err);
  }
}

/**
 * Retrieves learned column mappings from PostgreSQL (I2).
 */
export async function getOrgImportMapping(
  orgId: string,
  headersSignature: string
): Promise<SheetMapping[] | null> {
  try {
    const row = await prisma.importMapping.findUnique({
      where: {
        orgId_headersSignature: {
          orgId,
          headersSignature,
        },
      },
    });
    if (!row) return null;
    return JSON.parse(row.mappingJson) as SheetMapping[];
  } catch (err) {
    console.warn("[getOrgImportMapping] Could not retrieve mapping:", err);
    return null;
  }
}
