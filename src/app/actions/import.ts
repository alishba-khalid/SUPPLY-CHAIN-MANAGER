"use server";

import { requireOrgId, isDemoOrg, canWriteOrgData } from "@/lib/auth";
import { WRITE_BLOCKED_MESSAGE } from "@/lib/subscriptions/write-access";
import { importData } from "@/data/repositories/import";
import { parseTemplateRows, type TemplateType } from "@/lib/importer/template-rows";
import { EMPTY_TALLY } from "@/lib/importer/template-import";
import { revalidatePath } from "next/cache";

const DEMO_MSG = "Demo mode — action is simulated and not saved.";

export async function importDataAction(
  type: TemplateType,
  rows: Record<string, unknown>[],
  // firstRowNumber: the file row of rows[0], so rejected rows are reported
  // with the row number the user sees in their spreadsheet.
  options: { clearExisting: boolean; firstRowNumber?: number }
) {
  const orgId = await requireOrgId();
  if (!canWriteOrgData(orgId)) {
    return { success: false as const, writeBlocked: true as const, error: WRITE_BLOCKED_MESSAGE };
  }

  if (isDemoOrg(orgId)) {
    // Same row rules as a real import, so the demo reports the same rejections.
    const { records, rejected } = parseTemplateRows(type, rows, options.firstRowNumber ?? 2);
    return {
      success: true as const,
      isDemo: true,
      message: DEMO_MSG,
      count: records.length,
      rejected,
      // Nothing is compared or saved in the demo, so every valid row counts as checked.
      tally: { ...EMPTY_TALLY, added: records.length },
      counts: {
        warehouses: type === "warehouses" ? records.length : 0,
        suppliers: type === "suppliers" ? records.length : 0,
        products: type === "products" ? records.length : 0,
        inventory: type === "inventory" ? records.length : 0,
        purchaseOrders: type === "purchase_orders" ? records.length : 0,
        transactions: type === "transactions" ? records.length : 0,
      },
    };
  }

  const res = await importData(orgId, type, rows, options);

  if (res.success) {
    revalidatePath("/dashboard/overview");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/procurement");
    revalidatePath("/dashboard/suppliers");
    revalidatePath("/dashboard/warehouses");
  }

  return res;
}
