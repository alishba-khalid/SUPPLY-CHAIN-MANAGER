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

export type ReceivePurchaseOrderResult = "received" | "not-found" | "already-received";

/**
 * Marks an open PO as received and, when a warehouse is given, books its
 * quantity into that warehouse (an IN transaction plus the on-hand balance).
 * A PO that was already received is left alone, so its stock is never added
 * twice — including when two requests race each other.
 */
export async function receivePurchaseOrder(
  orgId: string,
  data: { poNumber: string; receivedDate: Date; warehouseId?: number },
): Promise<ReceivePurchaseOrderResult> {
  const { poNumber, receivedDate, warehouseId } = data;
  const po = await prisma.purchaseOrder.findUnique({ where: { orgId_poNumber: { orgId, poNumber } } });
  if (!po) return "not-found";
  if (po.receivedDate) return "already-received";

  return prisma.$transaction(async (tx) => {
    // Only an open PO flips to received; the loser of a race matches no row.
    const flipped = await tx.purchaseOrder.updateMany({
      where: { orgId, poNumber, receivedDate: null },
      data: { receivedDate },
    });
    if (flipped.count === 0) return "already-received" as const;

    if (warehouseId) {
      await tx.transaction.create({
        data: { orgId, sku: po.sku, warehouseId, quantity: po.quantity, direction: "IN", date: receivedDate },
      });
      await tx.inventory.upsert({
        where: { orgId_sku_warehouseId: { orgId, sku: po.sku, warehouseId } },
        create: { orgId, sku: po.sku, warehouseId, quantityOnHand: po.quantity },
        update: { quantityOnHand: { increment: po.quantity } },
      });
    }
    return "received" as const;
  });
}
