"use server";

import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { commitSmartImport, saveOrgImportMapping, getOrgImportMapping } from "@/data/repositories/smart-import";
import type { ImportCommitPayload, SheetMapping, ImportCommitResult } from "@/lib/importer/types";
import { revalidatePath } from "next/cache";

export async function commitSmartImportAction(payload: ImportCommitPayload): Promise<ImportCommitResult> {
  const orgId = await requireOrgId();

  if (isDemoOrg(orgId)) {
    return {
      success: true,
      importedCounts: {
        warehouses: payload.warehouses?.length || 0,
        suppliers: payload.suppliers?.length || 0,
        products: payload.products?.length || 0,
        inventory: payload.inventory?.length || 0,
        purchaseOrders: payload.purchaseOrders?.length || 0,
        transactions: payload.transactions?.length || 0,
      },
      missingLeadTimeCount: 0,
      missingCapacityCount: 0,
    };
  }

  const res = await commitSmartImport(orgId, payload);

  if (res.success) {
    revalidatePath("/dashboard/overview");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/procurement");
    revalidatePath("/dashboard/suppliers");
    revalidatePath("/dashboard/warehouses");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/dashboard/forecast-accuracy");
    revalidatePath("/dashboard/settings");
  }

  return res;
}

export async function saveOrgMappingAction(headersSignature: string, mappings: SheetMapping[]) {
  const orgId = await requireOrgId();
  if (isDemoOrg(orgId)) {
    return { success: true };
  }
  await saveOrgImportMapping(orgId, headersSignature, mappings);
  return { success: true };
}

export async function getOrgMappingAction(headersSignature: string) {
  const orgId = await requireOrgId();
  const mapping = await getOrgImportMapping(orgId, headersSignature);
  return { success: true, mapping };
}
