"use server";

import { requireOrgId, isDemoOrg, checkOrgWriteAccess } from "@/lib/auth";
import { WRITE_BLOCKED_MESSAGE } from "@/lib/subscriptions/write-access";
import { insertWarehouse } from "@/data/repositories/warehouses";
import { getSupplier, insertSupplier } from "@/data/repositories/suppliers";
import { insertProduct } from "@/data/repositories/products";
import { setStockLevel } from "@/data/repositories/inventory";
import { revalidatePath } from "next/cache";
import { duplicatePoNumberMessage } from "@/lib/procurement/po-number";
import { insertPurchaseOrder, receivePurchaseOrder } from "@/data/repositories/procurement";

const DEMO_MSG = "Demo mode — action is simulated and not saved.";

/** A whole number >= min, or null when it isn't one (NaN, blank, fraction). */
function wholeNumber(value: unknown, min: number): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= min ? n : null;
}

/** A YYYY-MM-DD date, or null when it isn't a real date. */
function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Add" never overwrites; changes to an existing record go through an import. */
function alreadyExistsMessage(kind: string, id: string, file: string): string {
  return `${kind} ${id} already exists, so nothing was changed. To update it, import your ${file} file.`;
}

function revalidateAllDashboard() {
  revalidatePath("/dashboard/overview");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/procurement");
  revalidatePath("/dashboard/suppliers");
  revalidatePath("/dashboard/warehouses");
  revalidatePath("/dashboard/logistics");
  revalidatePath("/dashboard/analytics");
}

export async function createWarehouseAction(data: {
  code: string;
  name: string;
  /** null = capacity unknown (stored as null, never as a made-up number). */
  capacityUnits: number | null;
}) {
  try {
    const orgId = await requireOrgId();
    if (!(await checkOrgWriteAccess(orgId))) return { success: false, writeBlocked: true, error: WRITE_BLOCKED_MESSAGE };
    const code = data.code.trim();
    const name = data.name.trim();
    const capacityUnits = data.capacityUnits == null ? null : wholeNumber(data.capacityUnits, 1);

    if (!code || !name) {
      return { success: false, error: "Warehouse code and name are required." };
    }
    if (data.capacityUnits != null && capacityUnits === null) {
      return { success: false, error: "Capacity must be a whole number above 0, or left blank if unknown." };
    }

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
        data: { id: 9999, orgId, code, name, capacityUnits, createdAt: new Date() },
      };
    }

    // Insert only: an existing code is an error, never a silent overwrite.
    const inserted = await insertWarehouse(orgId, { code, name, capacityUnits });
    if (!inserted.ok) {
      return { success: false, duplicate: true, error: alreadyExistsMessage("Warehouse", code, "warehouses") };
    }

    revalidateAllDashboard();
    return { success: true, data: inserted.value };
  } catch (error) {
    console.error("createWarehouseAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create warehouse." };
  }
}

export async function createSupplierAction(data: {
  supplierId: string;
  name: string;
  /** null = lead time not known yet (flagged as missing, like the importer does). */
  leadTimeDays: number | null;
  email?: string;
}) {
  try {
    const orgId = await requireOrgId();
    if (!(await checkOrgWriteAccess(orgId))) return { success: false, writeBlocked: true, error: WRITE_BLOCKED_MESSAGE };
    const supplierId = data.supplierId.trim();
    const name = data.name.trim();
    const leadTime = data.leadTimeDays == null ? null : wholeNumber(data.leadTimeDays, 1);
    // Same rule as the importer (src/lib/importer/template-rows.ts): a missing
    // lead time is stored as 14 days WITH leadTimeMissing = true, so the app
    // shows it as missing rather than as a real value.
    const leadTimeMissing = leadTime === null;
    const leadTimeDays = leadTime ?? 14;
    const email = (data.email || "").trim();

    if (!supplierId || !name) {
      return { success: false, error: "Supplier ID and Name are required." };
    }
    if (data.leadTimeDays != null && leadTime === null) {
      return { success: false, error: "Lead time must be a whole number of days above 0, or left blank if unknown." };
    }

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
        data: { id: 9999, orgId, supplierId, name, leadTimeDays, leadTimeMissing, email, createdAt: new Date() },
      };
    }

    const inserted = await insertSupplier(orgId, { supplierId, name, leadTimeDays, leadTimeMissing, email });
    if (!inserted.ok) {
      return { success: false, duplicate: true, error: alreadyExistsMessage("Supplier", supplierId, "suppliers") };
    }

    revalidateAllDashboard();
    return { success: true, data: inserted.value };
  } catch (error) {
    console.error("createSupplierAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create supplier." };
  }
}

export async function createProductAction(data: {
  sku: string;
  name: string;
  category: string;
  unitCost: number;
  supplierId: string;
}) {
  try {
    const orgId = await requireOrgId();
    if (!(await checkOrgWriteAccess(orgId))) return { success: false, writeBlocked: true, error: WRITE_BLOCKED_MESSAGE };
    const sku = data.sku.trim();
    const name = data.name.trim();
    const category = data.category.trim() || "general";
    const unitCost = Number(data.unitCost);
    const supplierId = data.supplierId.trim();

    if (!sku || !name || !supplierId) {
      return { success: false, error: "SKU, Product Name, and Supplier ID are required." };
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      return { success: false, error: "Unit cost must be a number of 0 or more." };
    }

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
        data: { id: 9999, orgId, sku, name, category, unitCost, supplierId, createdAt: new Date() },
      };
    }

    if (!(await getSupplier(orgId, supplierId))) {
      return { success: false, error: `Supplier '${supplierId}' not found.` };
    }

    const inserted = await insertProduct(orgId, { sku, name, category, unitCost, supplierId });
    if (!inserted.ok) {
      return { success: false, duplicate: true, error: alreadyExistsMessage("Product", sku, "products") };
    }

    revalidateAllDashboard();
    return { success: true, data: inserted.value };
  } catch (error) {
    console.error("createProductAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create product." };
  }
}

export async function adjustStockAction(data: {
  sku: string;
  warehouseId: number;
  quantityOnHand: number;
}) {
  try {
    const orgId = await requireOrgId();
    if (!(await checkOrgWriteAccess(orgId))) return { success: false, writeBlocked: true, error: WRITE_BLOCKED_MESSAGE };
    const sku = data.sku.trim();
    const warehouseId = Number(data.warehouseId);
    const quantityOnHand = wholeNumber(data.quantityOnHand, 0);

    if (!sku || !warehouseId) {
      return { success: false, error: "SKU and Warehouse are required." };
    }
    if (quantityOnHand === null) {
      return { success: false, error: "Quantity on hand must be a whole number of 0 or more." };
    }

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
        data: { id: 9999, orgId, sku, warehouseId, quantityOnHand, updatedAt: new Date() },
      };
    }

    const inventory = await setStockLevel(orgId, { sku, warehouseId, quantityOnHand });

    revalidateAllDashboard();
    return { success: true, data: inventory };
  } catch (error) {
    console.error("adjustStockAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to adjust inventory." };
  }
}

export async function createPurchaseOrderAction(data: {
  poNumber: string;
  supplierId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  orderDate: string;
  expectedDate: string;
}) {
  try {
    const orgId = await requireOrgId();
    if (!(await checkOrgWriteAccess(orgId))) return { success: false, writeBlocked: true, error: WRITE_BLOCKED_MESSAGE };
    const poNumber = data.poNumber.trim();
    const supplierId = data.supplierId.trim();
    const sku = data.sku.trim();
    const quantity = wholeNumber(data.quantity, 1);
    const unitPrice = Number(data.unitPrice);
    const orderDate = parseDay(data.orderDate);
    const expectedDate = parseDay(data.expectedDate);

    if (!poNumber || !supplierId || !sku) {
      return { success: false, error: "PO Number, Supplier, and SKU are required." };
    }
    if (quantity === null) {
      return { success: false, error: "Quantity must be a whole number above 0." };
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { success: false, error: "Unit price must be a number of 0 or more." };
    }
    if (!orderDate || !expectedDate) {
      return { success: false, error: "Order date and expected date must be valid dates." };
    }
    if (expectedDate < orderDate) {
      return { success: false, error: "The expected date can't be before the order date." };
    }

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
        data: {
          id: 9999,
          orgId,
          poNumber,
          supplierId,
          sku,
          quantity,
          unitPrice,
          orderDate,
          expectedDate,
          receivedDate: null,
          createdAt: new Date(),
        },
      };
    }

    // Insert only: a PO number that already exists is an error, never an overwrite.
    const inserted = await insertPurchaseOrder(orgId, { poNumber, supplierId, sku, quantity, unitPrice, orderDate, expectedDate });
    if (!inserted.ok) {
      return { success: false, duplicate: true, error: duplicatePoNumberMessage(poNumber) };
    }

    revalidateAllDashboard();
    return { success: true, data: inserted.value };
  } catch (error) {
    console.error("createPurchaseOrderAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create purchase order." };
  }
}

export async function receivePurchaseOrderAction(data: {
  poNumber: string;
  receivedDate: string;
  warehouseId?: number;
}) {
  try {
    const orgId = await requireOrgId();
    if (!(await checkOrgWriteAccess(orgId))) return { success: false, writeBlocked: true, error: WRITE_BLOCKED_MESSAGE };
    const poNumber = data.poNumber.trim();
    const receivedDate = parseDay(data.receivedDate);
    if (!receivedDate) {
      return { success: false, error: "Received date must be a valid date." };
    }

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
      };
    }

    const result = await receivePurchaseOrder(orgId, { poNumber, receivedDate, warehouseId: data.warehouseId });
    if (result === "not-found") {
      return { success: false, error: `Purchase order '${poNumber}' not found.` };
    }
    if (result === "already-received") {
      return {
        success: false,
        error: `Purchase order '${poNumber}' was already received. Its stock was added then, so it isn't added again.`,
      };
    }

    revalidateAllDashboard();
    return { success: true };
  } catch (error) {
    console.error("receivePurchaseOrderAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to receive purchase order." };
  }
}
