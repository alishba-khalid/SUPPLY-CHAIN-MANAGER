import type { PurchaseOrder } from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";
import { toISODate } from "@/lib/dates";
import { procurementHealthScore, averagePoCycleTimeDays } from "@/lib/metrics/procurement";
import { logisticsHealthScore } from "@/lib/metrics/logistics";

interface PurchaseOrderRow {
  id: number;
  poNumber: string;
  supplierId: string;
  sku: string;
  quantity: number;
  unitPrice: unknown;
  orderDate: Date;
  expectedDate: Date;
  receivedDate: Date | null;
}

export function toPurchaseOrder(row: PurchaseOrderRow): PurchaseOrder {
  return {
    id: row.id,
    poNumber: row.poNumber,
    supplierId: row.supplierId,
    sku: row.sku,
    quantity: row.quantity,
    unitPrice: Number(row.unitPrice),
    orderDate: toISODate(row.orderDate),
    expectedDate: toISODate(row.expectedDate),
    receivedDate: row.receivedDate ? toISODate(row.receivedDate) : null,
  };
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const rows = await prisma.purchaseOrder.findMany({ orderBy: { orderDate: "desc" } });
  return rows.map(toPurchaseOrder);
}

export async function getOpenPurchaseOrders(): Promise<PurchaseOrder[]> {
  const rows = await prisma.purchaseOrder.findMany({ where: { receivedDate: null }, orderBy: { expectedDate: "asc" } });
  return rows.map(toPurchaseOrder);
}

export async function getProcurementHealthScore(): Promise<number> {
  const [purchaseOrders, products] = await Promise.all([getPurchaseOrders(), prisma.product.findMany()]);
  const baselineCost = new Map(products.map((p) => [p.sku, Number(p.unitCost)]));
  return procurementHealthScore(purchaseOrders, baselineCost);
}

export async function getAveragePoCycleTimeDays(): Promise<number | null> {
  return averagePoCycleTimeDays(await getPurchaseOrders());
}

export async function getLogisticsHealthScore(): Promise<number> {
  return logisticsHealthScore(await getPurchaseOrders());
}
