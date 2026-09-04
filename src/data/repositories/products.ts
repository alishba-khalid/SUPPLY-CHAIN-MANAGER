import type { Product } from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";

function toProduct(row: { id: number; sku: string; name: string; category: string; unitCost: unknown; supplierId: string }): Product {
  return { ...row, unitCost: Number(row.unitCost) };
}

export async function getProducts(orgId: string): Promise<Product[]> {
  const rows = await prisma.product.findMany({ where: { orgId }, orderBy: { sku: "asc" } });
  return rows.map(toProduct);
}

export async function getProduct(orgId: string, sku: string): Promise<Product | undefined> {
  const row = await prisma.product.findUnique({ where: { orgId_sku: { orgId, sku } } });
  return row ? toProduct(row) : undefined;
}
