/**
 * Derives a unified "recent activity" feed from the same dated records
 * every other module reads — there is no separate stored activity/event
 * log. See docs/metrics.md for the windowing rule and the "notable"
 * threshold (kept deliberately small so the feed doesn't flood with every
 * routine transaction).
 */
import type { ActivityEvent } from "@/types/supply-chain";
import { isWithinTrailingWindow } from "@/lib/dates";
import { getPurchaseOrders } from "@/data/repositories/procurement";
import { getInventoryTransactions } from "@/data/repositories/inventory";
import { getSuppliers } from "@/data/repositories/suppliers";
import { getProducts } from "@/data/repositories/products";
import { getWarehouses } from "@/data/repositories/warehouses";
import { purchaseOrderValue } from "@/lib/metrics/supplier";

const ACTIVITY_WINDOW_DAYS = 14;
const NOTABLE_MOVEMENT_QTY = 15; // transactions below this are too routine to surface

const TYPE_RANK: Record<ActivityEvent["type"], number> = {
  po_received: 0,
  inventory_movement: 1,
};

export async function getRecentActivity(orgId: string, limit = 15): Promise<ActivityEvent[]> {
  const [purchaseOrders, transactions, suppliers, products, warehouses] = await Promise.all([
    getPurchaseOrders(orgId),
    getInventoryTransactions(orgId),
    getSuppliers(orgId),
    getProducts(orgId),
    getWarehouses(orgId),
  ]);

  const supplierBySupplierId = new Map(suppliers.map((s) => [s.supplierId, s]));
  const productBySku = new Map(products.map((p) => [p.sku, p]));
  const warehouseById = new Map(warehouses.map((w) => [w.id, w]));

  const events: ActivityEvent[] = [];

  for (const po of purchaseOrders) {
    if (!po.receivedDate) continue;
    if (!isWithinTrailingWindow(po.receivedDate, ACTIVITY_WINDOW_DAYS)) continue;
    const supplier = supplierBySupplierId.get(po.supplierId);
    events.push({
      id: `ACT-PO-${po.id}`,
      type: "po_received",
      date: po.receivedDate,
      title: "Purchase order received",
      description: `${po.poNumber} received from ${supplier?.name ?? "an unknown supplier"} — ${po.quantity} units of ${po.sku}, $${Math.round(purchaseOrderValue(po)).toLocaleString()}.`,
      supplierId: po.supplierId,
      sku: po.sku,
    });
  }

  for (const txn of transactions) {
    if (txn.quantity < NOTABLE_MOVEMENT_QTY) continue;
    if (!isWithinTrailingWindow(txn.date, ACTIVITY_WINDOW_DAYS)) continue;
    const product = productBySku.get(txn.sku);
    const warehouse = warehouseById.get(txn.warehouseId);
    events.push({
      id: `ACT-TXN-${txn.id}`,
      type: "inventory_movement",
      date: txn.date,
      title: txn.direction === "IN" ? "Inbound stock received" : "Outbound stock shipped",
      description: `${txn.quantity} units of ${product?.sku ?? txn.sku} ${txn.direction === "IN" ? "into" : "out of"} ${warehouse?.code ?? txn.warehouseId}.`,
      sku: txn.sku,
      warehouseId: txn.warehouseId,
    });
  }

  events.sort((a, b) => (a.date === b.date ? TYPE_RANK[a.type] - TYPE_RANK[b.type] : a.date < b.date ? 1 : -1));

  return events.slice(0, limit);
}
