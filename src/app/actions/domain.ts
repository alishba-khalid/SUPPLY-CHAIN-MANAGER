"use server";

import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { duplicatePoNumberMessage } from "@/lib/procurement/po-number";
import { insertPurchaseOrder } from "@/data/repositories/procurement";

const DEMO_MSG = "Demo mode — action is simulated and not saved.";

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
  capacityUnits: number;
}) {
  try {
    const orgId = await requireOrgId();
    const code = data.code.trim();
    const name = data.name.trim();
    const capacityUnits = Number(data.capacityUnits) || 0;

    if (!code || !name) {
      return { success: false, error: "Warehouse code and name are required." };
    }

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
        data: { id: 9999, orgId, code, name, capacityUnits, createdAt: new Date() },
      };
    }

    const warehouse = await prisma.warehouse.upsert({
      where: { orgId_code: { orgId, code } },
      create: { orgId, code, name, capacityUnits },
      update: { name, capacityUnits },
    });

    revalidateAllDashboard();
    return { success: true, data: warehouse };
  } catch (error) {
    console.error("createWarehouseAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create warehouse." };
  }
}

export async function createSupplierAction(data: {
  supplierId: string;
  name: string;
  leadTimeDays: number;
  email?: string;
}) {
  try {
    const orgId = await requireOrgId();
    const supplierId = data.supplierId.trim();
    const name = data.name.trim();
    const leadTimeDays = Number(data.leadTimeDays) || 14;
    const email = (data.email || "").trim() || `${supplierId.toLowerCase()}@example.com`;

    if (!supplierId || !name) {
      return { success: false, error: "Supplier ID and Name are required." };
    }

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
        data: { id: 9999, orgId, supplierId, name, leadTimeDays, email, createdAt: new Date() },
      };
    }

    const supplier = await prisma.supplier.upsert({
      where: { orgId_supplierId: { orgId, supplierId } },
      create: { orgId, supplierId, name, leadTimeDays, email },
      update: { name, leadTimeDays, email },
    });

    revalidateAllDashboard();
    return { success: true, data: supplier };
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
    const sku = data.sku.trim();
    const name = data.name.trim();
    const category = data.category.trim() || "general";
    const unitCost = Number(data.unitCost) || 0;
    const supplierId = data.supplierId.trim();

    if (!sku || !name || !supplierId) {
      return { success: false, error: "SKU, Product Name, and Supplier ID are required." };
    }

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
        data: { id: 9999, orgId, sku, name, category, unitCost, supplierId, createdAt: new Date() },
      };
    }

    const supplier = await prisma.supplier.findUnique({
      where: { orgId_supplierId: { orgId, supplierId } },
    });
    if (!supplier) {
      return { success: false, error: `Supplier '${supplierId}' not found.` };
    }

    const product = await prisma.product.upsert({
      where: { orgId_sku: { orgId, sku } },
      create: { orgId, sku, name, category, unitCost, supplierId },
      update: { name, category, unitCost, supplierId },
    });

    revalidateAllDashboard();
    return { success: true, data: product };
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
    const sku = data.sku.trim();
    const warehouseId = Number(data.warehouseId);
    const quantityOnHand = Number(data.quantityOnHand) || 0;

    if (!sku || !warehouseId) {
      return { success: false, error: "SKU and Warehouse are required." };
    }

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
        data: { id: 9999, orgId, sku, warehouseId, quantityOnHand, updatedAt: new Date() },
      };
    }

    const inventory = await prisma.inventory.upsert({
      where: { orgId_sku_warehouseId: { orgId, sku, warehouseId } },
      create: { orgId, sku, warehouseId, quantityOnHand },
      update: { quantityOnHand },
    });

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
    const poNumber = data.poNumber.trim();
    const supplierId = data.supplierId.trim();
    const sku = data.sku.trim();
    const quantity = Number(data.quantity) || 0;
    const unitPrice = Number(data.unitPrice) || 0;
    const orderDate = new Date(data.orderDate);
    const expectedDate = new Date(data.expectedDate);

    if (!poNumber || !supplierId || !sku) {
      return { success: false, error: "PO Number, Supplier, and SKU are required." };
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
    const poNumber = data.poNumber.trim();
    const receivedDate = new Date(data.receivedDate);

    if (isDemoOrg(orgId)) {
      return {
        success: true,
        isDemo: true,
        message: DEMO_MSG,
      };
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { orgId_poNumber: { orgId, poNumber } },
    });

    if (!po) {
      return { success: false, error: `Purchase order '${poNumber}' not found.` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { orgId_poNumber: { orgId, poNumber } },
        data: { receivedDate },
      });

      if (data.warehouseId) {
        // Record inbound inventory transaction
        await tx.transaction.create({
          data: {
            orgId,
            sku: po.sku,
            warehouseId: data.warehouseId,
            quantity: po.quantity,
            direction: "IN",
            date: receivedDate,
          },
        });

        // Increment inventory balance
        await tx.inventory.upsert({
          where: { orgId_sku_warehouseId: { orgId, sku: po.sku, warehouseId: data.warehouseId } },
          create: { orgId, sku: po.sku, warehouseId: data.warehouseId, quantityOnHand: po.quantity },
          update: { quantityOnHand: { increment: po.quantity } },
        });
      }
    });

    revalidateAllDashboard();
    return { success: true };
  } catch (error) {
    console.error("receivePurchaseOrderAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to receive purchase order." };
  }
}
