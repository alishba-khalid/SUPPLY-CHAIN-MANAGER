import type { Supplier, SupplierPerformance } from "@/types/supply-chain";
import { getSeedData } from "@/data/mock/seed";
import { computeSupplierPerformance, supplierHealthScore } from "@/lib/metrics/supplier";

export async function getSuppliers(): Promise<Supplier[]> {
  return getSeedData().suppliers;
}

export async function getSupplier(supplierId: string): Promise<Supplier | undefined> {
  return getSeedData().suppliers.find((s) => s.id === supplierId);
}

export async function getSupplierPerformance(supplierId: string): Promise<SupplierPerformance> {
  const { purchaseOrders } = getSeedData();
  return computeSupplierPerformance(supplierId, purchaseOrders);
}

export async function getAllSupplierPerformance(): Promise<SupplierPerformance[]> {
  const { suppliers, purchaseOrders } = getSeedData();
  return suppliers.map((s) => computeSupplierPerformance(s.id, purchaseOrders));
}

export async function getSupplierHealthScore(): Promise<number> {
  const performances = await getAllSupplierPerformance();
  return supplierHealthScore(performances);
}
