import type { InventoryInsight, InventoryRecord, InventoryTransaction } from "@/types/supply-chain";
import { getSeedData } from "@/data/mock/seed";
import { buildInventoryInsight, inventoryHealthScore } from "@/lib/metrics/inventory";

export async function getInventoryRecords(): Promise<InventoryRecord[]> {
  return getSeedData().inventoryRecords;
}

export async function getInventoryTransactions(filter?: {
  productId?: string;
  warehouseId?: string;
}): Promise<InventoryTransaction[]> {
  const { inventoryTransactions } = getSeedData();
  if (!filter) return inventoryTransactions;
  return inventoryTransactions.filter(
    (t) =>
      (!filter.productId || t.productId === filter.productId) &&
      (!filter.warehouseId || t.warehouseId === filter.warehouseId),
  );
}

/** One insight per (active product, warehouse) pair currently carrying stock. */
export async function getInventoryInsights(): Promise<InventoryInsight[]> {
  const { inventoryRecords, inventoryTransactions, products, suppliers } = getSeedData();
  const productById = new Map(products.map((p) => [p.id, p]));
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  return inventoryRecords
    .filter((record) => productById.get(record.productId)?.active)
    .map((record) => {
      const product = productById.get(record.productId);
      const supplier = product ? supplierById.get(product.primarySupplierId) : undefined;
      const leadTimeDays = supplier?.leadTimeDays ?? 14;
      return buildInventoryInsight(inventoryTransactions, record, leadTimeDays);
    });
}

export async function getInventoryHealthScore(): Promise<number> {
  const insights = await getInventoryInsights();
  return inventoryHealthScore(insights);
}

export async function getTotalInventoryValue(): Promise<number> {
  const { inventoryRecords, products } = getSeedData();
  const productById = new Map(products.map((p) => [p.id, p]));
  const total = inventoryRecords.reduce((sum, r) => {
    const cost = productById.get(r.productId)?.unitCost ?? 0;
    return sum + r.quantityOnHand * cost;
  }, 0);
  return Math.round(total * 100) / 100;
}
