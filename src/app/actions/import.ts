"use server";

import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { importData } from "@/data/repositories/import";
import { revalidatePath } from "next/cache";

const DEMO_MSG = "Demo mode — action is simulated and not saved.";

export async function importDataAction(
  type: "warehouses" | "suppliers" | "products" | "inventory" | "purchase_orders" | "transactions",
  rows: Record<string, unknown>[],
  options: { clearExisting: boolean }
) {
  const orgId = await requireOrgId();

  if (isDemoOrg(orgId)) {
    return {
      success: true,
      isDemo: true,
      message: DEMO_MSG,
      counts: {
        warehouses: type === "warehouses" ? rows.length : 0,
        suppliers: type === "suppliers" ? rows.length : 0,
        products: type === "products" ? rows.length : 0,
        inventory: type === "inventory" ? rows.length : 0,
        purchaseOrders: type === "purchase_orders" ? rows.length : 0,
        transactions: type === "transactions" ? rows.length : 0,
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
