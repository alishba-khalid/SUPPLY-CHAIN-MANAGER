import type { PurchaseOrder, Supplier, SupplierPerformance } from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";
import { isDuplicateKeyError, type InsertResult } from "@/lib/procurement/po-number";
import { computeSupplierPerformance, supplierHealthScore } from "@/lib/metrics/supplier";
import { toPurchaseOrder } from "./procurement";

export async function getSuppliers(orgId: string): Promise<Supplier[]> {
  return prisma.supplier.findMany({ where: { orgId }, orderBy: { name: "asc" } });
}

export async function getSupplier(orgId: string, supplierId: string): Promise<Supplier | undefined> {
  const row = await prisma.supplier.findUnique({ where: { orgId_supplierId: { orgId, supplierId } } });
  return row ?? undefined;
}

async function allPurchaseOrders(orgId: string): Promise<PurchaseOrder[]> {
  const rows = await prisma.purchaseOrder.findMany({ where: { orgId } });
  return rows.map(toPurchaseOrder);
}

export async function getSupplierPerformance(orgId: string, supplierId: string): Promise<SupplierPerformance> {
  const purchaseOrders = await allPurchaseOrders(orgId);
  return computeSupplierPerformance(supplierId, purchaseOrders);
}

export async function getAllSupplierPerformance(orgId: string): Promise<SupplierPerformance[]> {
  const [suppliers, purchaseOrders] = await Promise.all([getSuppliers(orgId), allPurchaseOrders(orgId)]);
  return suppliers.map((s) => computeSupplierPerformance(s.supplierId, purchaseOrders));
}

/** Null when no supplier has on-time data in the last 90 days. */
export async function getSupplierHealthScore(orgId: string): Promise<number | null> {
  const performances = await getAllSupplierPerformance(orgId);
  return supplierHealthScore(performances);
}

/** Adds a supplier. Never updates: an existing supplier ID is reported as a duplicate. */
export async function insertSupplier(
  orgId: string,
  data: { supplierId: string; name: string; leadTimeDays: number; leadTimeMissing: boolean; email: string },
): Promise<InsertResult<Supplier>> {
  try {
    const row = await prisma.supplier.create({ data: { orgId, ...data } });
    return { ok: true, value: row };
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false, duplicate: true };
    throw error;
  }
}
