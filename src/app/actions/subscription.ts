"use server";

import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { updateOrgSubscription } from "@/data/repositories/subscription";
import { createPurchaseOrderAction } from "@/app/actions/domain";
import type { PlanTier, BillingCycle } from "@/types/subscription";
import type { SuggestedPurchaseOrder } from "@/lib/forecasting/demand-forecast";
import { revalidatePath } from "next/cache";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { invalidSuggestedPoReason } from "@/lib/insights/quick-order";
import { getSupplier } from "@/data/repositories/suppliers";
import { getHighestPoNumber } from "@/data/repositories/procurement";
import { insertWithNextPoNumber } from "@/lib/procurement/po-number";

const DEMO_MSG = "Demo mode — action is simulated and not saved.";

export async function changePlanAction({
  plan,
  billingCycle,
}: {
  plan: PlanTier;
  billingCycle?: BillingCycle;
}) {
  try {
    const orgId = await requireOrgId();

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
      };
    }

    const updated = await updateOrgSubscription(orgId, { plan, billingCycle });
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/overview");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/ai-manager");
    return { success: true, subscription: updated };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update subscription." };
  }
}

export async function createPoFromSuggestionAction(suggestion: SuggestedPurchaseOrder) {
  try {
    const orgId = await requireOrgId();

    const invalid = invalidSuggestedPoReason({
      supplierId: suggestion.supplierId,
      quantity: suggestion.suggestedQuantity,
      unitPrice: suggestion.unitPrice,
    });
    if (invalid) return { success: false, error: invalid };

    const ip = await getRequestIp();
    const rateLimit = await checkRateLimit(`po-action:ip:${ip}`, 20, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return { success: false, error: "Too many requests — please wait a few minutes and try again." };
    }

    const today = new Date();
    const orderDate = today.toISOString().slice(0, 10);
    const expected = new Date(today);
    expected.setDate(expected.getDate() + (suggestion.supplierLeadTimeDays || 14));
    const expectedDate = expected.toISOString().slice(0, 10);

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
      };
    }

    if (!(await getSupplier(orgId, suggestion.supplierId))) {
      return { success: false, error: `Supplier ${suggestion.supplierId} isn't on file for this workspace.` };
    }

    // Next number in this workspace's PO series; if another order takes it
    // first, the insert is rejected (never overwritten) and the next one is tried.
    const created = await insertWithNextPoNumber({
      highestExisting: () => getHighestPoNumber(orgId),
      insert: async (poNumber) => {
        const res = await createPurchaseOrderAction({
          poNumber,
          supplierId: suggestion.supplierId,
          sku: suggestion.sku,
          quantity: suggestion.suggestedQuantity,
          unitPrice: suggestion.unitPrice,
          orderDate,
          expectedDate,
        });
        if (res.success) return { ok: true as const, value: res };
        if ("duplicate" in res && res.duplicate) return { ok: false as const, duplicate: true as const };
        return { ok: false as const, duplicate: false as const, error: res.error ?? "Failed to create PO from suggestion." };
      },
    });
    if (!created.ok) return { success: false, error: created.error };

    revalidatePath("/dashboard/overview");
    revalidatePath("/dashboard/procurement");
    revalidatePath("/dashboard/inventory");

    return { ...created.value, message: `Purchase order ${created.poNumber} created.` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create PO from suggestion." };
  }
}
