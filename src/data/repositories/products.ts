import type { Product } from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";

function toProduct(row: { id: number; sku: string; name: string; category: string; unitCost: unknown; supplierId: string }): Product {
  return { ...row, unitCost: Number(row.unitCost) };
}

export async function getProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({ orderBy: { sku: "asc" } });
  return rows.map(toProduct);
}

export async function getProduct(sku: string): Promise<Product | undefined> {
  const row = await prisma.product.findUnique({ where: { sku } });
  return row ? toProduct(row) : undefined;
}
