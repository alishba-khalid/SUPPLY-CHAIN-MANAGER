import type { PurchaseOrder } from "@/types/supply-chain";
import { getSeedData } from "@/data/mock/seed";
import { isWithinTrailingWindow } from "@/data/mock/dates";
import { procurementHealthScore } from "@/lib/metrics/procurement";

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  return getSeedData().purchaseOrders;
}

export async function getPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrder | undefined> {
  return getSeedData().purchaseOrders.find((po) => po.id === purchaseOrderId);
}

export async function getOpenPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { purchaseOrders } = getSeedData();
  return purchaseOrders.filter((po) => po.status === "sent" || po.status === "approved" || po.status === "partially_received");
}

export async function getPendingApprovalPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { purchaseOrders } = getSeedData();
  return purchaseOrders.filter((po) => po.status === "pending_approval" || po.status === "draft");
}

/** Trailing 90-day procurement spend across received purchase orders. */
export async function getTrailingProcurementSpend(windowDays = 90): Promise<number> {
  const { purchaseOrders } = getSeedData();
  const total = purchaseOrders
    .filter((po) => po.status === "received" && po.actualDeliveryDate && isWithinTrailingWindow(po.actualDeliveryDate, windowDays))
    .reduce((sum, po) => sum + po.purchaseOrderValue, 0);
  return Math.round(total * 100) / 100;
}

export async function getProcurementHealthScore(): Promise<number> {
  const { purchaseOrders, products } = getSeedData();
  const baselineCost = new Map(products.map((p) => [p.id, p.unitCost]));
  return procurementHealthScore(purchaseOrders, baselineCost);
}
