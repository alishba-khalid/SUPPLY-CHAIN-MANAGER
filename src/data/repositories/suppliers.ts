import type { PurchaseOrder, Supplier, SupplierPerformance } from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";
import { computeSupplierPerformance, supplierHealthScore } from "@/lib/metrics/supplier";
import { toPurchaseOrder } from "./procurement";

export async function getSuppliers(): Promise<Supplier[]> {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function getSupplier(supplierId: string): Promise<Supplier | undefined> {
  const row = await prisma.supplier.findUnique({ where: { supplierId } });
  return row ?? undefined;
}

async function allPurchaseOrders(): Promise<PurchaseOrder[]> {
  const rows = await prisma.purchaseOrder.findMany();
  return rows.map(toPurchaseOrder);
}

export async function getSupplierPerformance(supplierId: string): Promise<SupplierPerformance> {
  const purchaseOrders = await allPurchaseOrders();
  return computeSupplierPerformance(supplierId, purchaseOrders);
}

export async function getAllSupplierPerformance(): Promise<SupplierPerformance[]> {
  const [suppliers, purchaseOrders] = await Promise.all([getSuppliers(), allPurchaseOrders()]);
  return suppliers.map((s) => computeSupplierPerformance(s.supplierId, purchaseOrders));
}

export async function getSupplierHealthScore(): Promise<number> {
  const performances = await getAllSupplierPerformance();
  return supplierHealthScore(performances);
}
