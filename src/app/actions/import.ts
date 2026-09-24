"use server";

import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { importData } from "@/data/repositories/import";
import { parseTemplateRows, type TemplateType } from "@/lib/importer/template-rows";
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

  if (isDemoOrg(orgId)) {
    // Same row rules as a real import, so the demo reports the same rejections.
    const { records, rejected } = parseTemplateRows(type, rows, options.firstRowNumber ?? 2);
    return {
      success: true,
      isDemo: true,
      message: DEMO_MSG,
      count: records.length,
      rejected,
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
