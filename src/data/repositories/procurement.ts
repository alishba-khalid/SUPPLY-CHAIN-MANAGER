import type { PurchaseOrder } from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";
import { toISODate } from "@/lib/dates";
import { procurementHealthScore, averagePoCycleTimeDays } from "@/lib/metrics/procurement";
import { logisticsHealthScore } from "@/lib/metrics/logistics";
import { isDuplicateKeyError, type InsertResult } from "@/lib/procurement/po-number";

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

export async function getPurchaseOrders(orgId: string): Promise<PurchaseOrder[]> {
  const rows = await prisma.purchaseOrder.findMany({ where: { orgId }, orderBy: { orderDate: "desc" } });
  return rows.map(toPurchaseOrder);
}

/**
 * Inserts a new PO. Never updates: if the number already exists in this
 * workspace the unique (org, PO number) rule rejects it and this reports a
 * duplicate, so an existing purchase order is never overwritten.
 */
export async function insertPurchaseOrder(
  orgId: string,
  data: { poNumber: string; supplierId: string; sku: string; quantity: number; unitPrice: number; orderDate: Date; expectedDate: Date },
): Promise<InsertResult<PurchaseOrder>> {
  try {
    const row = await prisma.purchaseOrder.create({ data: { orgId, ...data, receivedDate: null } });
    return { ok: true, value: toPurchaseOrder(row) };
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false, duplicate: true };
    throw error;
  }
}

/** Highest N among this workspace's "PO-<N>" numbers (other formats ignored), or null if there are none. */
export async function getHighestPoNumber(orgId: string): Promise<number | null> {
  const [row] = await prisma.$queryRaw<{ highest: bigint | number | string | null }[]>`
    SELECT max(substring(po_number FROM 4)::bigint) AS highest
    FROM purchase_orders
    WHERE org_id = ${orgId} AND po_number ~ '^PO-[0-9]{1,15}$'`;
  return row?.highest == null ? null : Number(row.highest);
}

export async function getOpenPurchaseOrders(orgId: string): Promise<PurchaseOrder[]> {
  const rows = await prisma.purchaseOrder.findMany({
    where: { orgId, receivedDate: null },
    orderBy: { expectedDate: "asc" },
  });
  return rows.map(toPurchaseOrder);
}

export async function getProcurementHealthScore(orgId: string): Promise<number> {
  const [purchaseOrders, products] = await Promise.all([getPurchaseOrders(orgId), prisma.product.findMany({ where: { orgId } })]);
  const baselineCost = new Map(products.map((p) => [p.sku, Number(p.unitCost)]));
  return procurementHealthScore(purchaseOrders, baselineCost);
}

export async function getAveragePoCycleTimeDays(orgId: string): Promise<number | null> {
  return averagePoCycleTimeDays(await getPurchaseOrders(orgId));
}

export async function getLogisticsHealthScore(orgId: string): Promise<number> {
  return logisticsHealthScore(await getPurchaseOrders(orgId));
}
