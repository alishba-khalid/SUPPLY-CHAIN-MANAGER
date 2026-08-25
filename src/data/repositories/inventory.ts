import type { InventoryInsight, InventoryRecord, InventoryTransaction } from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";
import { toISODate } from "@/lib/dates";
import { buildInventoryInsight, inventoryHealthScore } from "@/lib/metrics/inventory";

export async function getInventoryRecords(): Promise<InventoryRecord[]> {
  return prisma.inventory.findMany({ orderBy: { sku: "asc" } });
}

export async function getInventoryTransactions(filter?: {
  sku?: string;
  warehouseId?: number;
}): Promise<InventoryTransaction[]> {
  const rows = await prisma.transaction.findMany({
    where: { sku: filter?.sku, warehouseId: filter?.warehouseId },
    orderBy: { date: "asc" },
  });
  return rows.map((t) => ({ ...t, date: toISODate(t.date) }));
}

/** One insight per (product, warehouse) pair currently carrying stock. */
export async function getInventoryInsights(): Promise<InventoryInsight[]> {
  const [records, transactions, products, suppliers] = await Promise.all([
    getInventoryRecords(),
    getInventoryTransactions(),
    prisma.product.findMany(),
    prisma.supplier.findMany(),
  ]);
  const supplierBySkuOwner = new Map(products.map((p) => [p.sku, p.supplierId]));
  const leadTimeBySupplierId = new Map(suppliers.map((s) => [s.supplierId, s.leadTimeDays]));

  return records.map((record) => {
    const supplierId = supplierBySkuOwner.get(record.sku);
    const leadTimeDays = (supplierId !== undefined ? leadTimeBySupplierId.get(supplierId) : undefined) ?? 14;
    return buildInventoryInsight(transactions, record, leadTimeDays);
  });
}

export async function getInventoryHealthScore(): Promise<number> {
  const insights = await getInventoryInsights();
  return inventoryHealthScore(insights);
}

export async function getTotalInventoryValue(): Promise<number> {
  const [records, products] = await Promise.all([getInventoryRecords(), prisma.product.findMany()]);
  const costBySku = new Map(products.map((p) => [p.sku, Number(p.unitCost)]));
  const total = records.reduce((sum, r) => sum + r.quantityOnHand * (costBySku.get(r.sku) ?? 0), 0);
  return Math.round(total * 100) / 100;
}
