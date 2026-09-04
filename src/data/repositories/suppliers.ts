import type { PurchaseOrder, Supplier, SupplierPerformance } from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";
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

export async function getSupplierHealthScore(orgId: string): Promise<number> {
  const performances = await getAllSupplierPerformance(orgId);
  return supplierHealthScore(performances);
}
