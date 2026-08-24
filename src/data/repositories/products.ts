import type { Product } from "@/types/supply-chain";
import { getSeedData } from "@/data/mock/seed";

export async function getProducts(): Promise<Product[]> {
  return getSeedData().products;
}

export async function getActiveProducts(): Promise<Product[]> {
  return getSeedData().products.filter((p) => p.active);
}

export async function getProduct(productId: string): Promise<Product | undefined> {
  return getSeedData().products.find((p) => p.id === productId);
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  return getSeedData().products.find((p) => p.sku === sku);
}
