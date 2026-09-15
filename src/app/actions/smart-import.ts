"use server";

import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { commitSmartImport, saveOrgImportMapping, getOrgImportMapping } from "@/data/repositories/smart-import";
import type { ImportCommitPayload, SheetMapping, ImportCommitResult } from "@/lib/importer/types";
import { revalidatePath } from "next/cache";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

const MAX_IMPORT_ROWS = 5000;
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2MB — matches next.config.ts's serverActions.bodySizeLimit
const IMPORT_PER_IP_LIMIT = 10;
const IMPORT_PER_IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function totalRowCount(payload: ImportCommitPayload): number {
  return (
    (payload.warehouses?.length || 0) +
    (payload.suppliers?.length || 0) +
    (payload.products?.length || 0) +
    (payload.inventory?.length || 0) +
    (payload.purchaseOrders?.length || 0) +
    (payload.transactions?.length || 0)
  );
}

export async function commitSmartImportAction(payload: ImportCommitPayload): Promise<ImportCommitResult> {
  const orgId = await requireOrgId();

  // Server-side enforcement of the same 5,000-row cap the UI shows, plus a
  // byte-size cap (a payload can stay under the row cap while still being
  // huge via oversized field values) — the UI checks alone don't stop a
  // request crafted to call this action directly. Both checked before the
  // demo no-op so oversized payloads are rejected, not silently "succeeded".
  const rowCount = totalRowCount(payload);
  const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  if (rowCount > MAX_IMPORT_ROWS || payloadBytes > MAX_PAYLOAD_BYTES) {
    return {
      success: false,
      importedCounts: { warehouses: 0, suppliers: 0, products: 0, inventory: 0, purchaseOrders: 0, transactions: 0 },
      missingLeadTimeCount: 0,
      missingCapacityCount: 0,
      error:
        rowCount > MAX_IMPORT_ROWS
          ? `Import limited to ${MAX_IMPORT_ROWS.toLocaleString()} rows per file. This file has ${rowCount.toLocaleString()} rows.`
          : `Import payload too large (${(payloadBytes / (1024 * 1024)).toFixed(1)}MB, limit ${(MAX_PAYLOAD_BYTES / (1024 * 1024)).toFixed(0)}MB).`,
    };
  }

  const ip = await getRequestIp();
  const rateLimit = await checkRateLimit(`import:ip:${ip}`, IMPORT_PER_IP_LIMIT, IMPORT_PER_IP_WINDOW_MS);
  if (!rateLimit.allowed) {
    return {
      success: false,
      importedCounts: { warehouses: 0, suppliers: 0, products: 0, inventory: 0, purchaseOrders: 0, transactions: 0 },
      missingLeadTimeCount: 0,
      missingCapacityCount: 0,
      error: "Too many import attempts — please wait a few minutes and try again.",
    };
  }

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
