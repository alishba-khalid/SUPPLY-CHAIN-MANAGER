/**
 * Derives a unified "recent activity" feed from the same dated records
 * every other module reads — there is no separate stored activity/event
 * log. See docs/metrics.md for the windowing rule and per-source
 * "notable" thresholds (kept deliberately small so the feed doesn't flood
 * with every minor fulfilled order or cycle-count adjustment).
 */
import type { ActivityEvent } from "@/types/supply-chain";
import { isWithinTrailingWindow } from "@/data/mock/dates";
import { getPurchaseOrders } from "@/data/repositories/procurement";
import { getShipments } from "@/data/repositories/shipments";
import { getCustomerOrders } from "@/data/repositories/customers";
import { getInventoryTransactions } from "@/data/repositories/inventory";
import { getSuppliers } from "@/data/repositories/suppliers";
import { getProducts } from "@/data/repositories/products";
import { getWarehouses } from "@/data/repositories/warehouses";

const ACTIVITY_WINDOW_DAYS = 14;
const NOTABLE_ORDER_VALUE = 500; // customer orders below this are too routine to surface
const NOTABLE_ADJUSTMENT_QTY = 15; // cycle-count adjustments below this are too routine to surface

const TYPE_RANK: Record<ActivityEvent["type"], number> = {
  shipment_delayed: 0,
  po_received: 1,
  customer_order_fulfilled: 2,
  inventory_adjustment: 3,
};

export async function getRecentActivity(limit = 15): Promise<ActivityEvent[]> {
  const [purchaseOrders, shipments, customerOrders, transactions, suppliers, products, warehouses] = await Promise.all([
    getPurchaseOrders(),
    getShipments(),
    getCustomerOrders(),
    getInventoryTransactions(),
    getSuppliers(),
    getProducts(),
    getWarehouses(),
  ]);

  const supplierById = new Map(suppliers.map((s) => [s.id, s]));
  const productById = new Map(products.map((p) => [p.id, p]));
  const warehouseById = new Map(warehouses.map((w) => [w.id, w]));

  const events: ActivityEvent[] = [];

  for (const po of purchaseOrders) {
    if (po.status !== "received" || !po.actualDeliveryDate) continue;
    if (!isWithinTrailingWindow(po.actualDeliveryDate, ACTIVITY_WINDOW_DAYS)) continue;
    const supplier = supplierById.get(po.supplierId);
    const warehouse = warehouseById.get(po.warehouseId);
    events.push({
      id: `ACT-PO-${po.id}`,
      type: "po_received",
      date: po.actualDeliveryDate,
      title: "Purchase order received",
      description: `${po.poNumber} received from ${supplier?.name ?? "an unknown supplier"} — $${Math.round(po.purchaseOrderValue).toLocaleString()} into ${warehouse?.code ?? po.warehouseId}.`,
      supplierId: po.supplierId,
      warehouseId: po.warehouseId,
    });
  }

  for (const shipment of shipments) {
    if (shipment.status !== "delayed") continue;
    if (!isWithinTrailingWindow(shipment.expectedDeliveryDate, ACTIVITY_WINDOW_DAYS)) continue;
    const warehouseId = shipment.destinationWarehouseId ?? shipment.originWarehouseId;
    const warehouse = warehouseId ? warehouseById.get(warehouseId) : undefined;
    events.push({
      id: `ACT-SHP-${shipment.id}`,
      type: "shipment_delayed",
      date: shipment.expectedDeliveryDate,
      title: "Shipment delayed",
      description: `${shipment.shipmentNumber} (${shipment.direction}) is overdue at ${warehouse?.code ?? "its destination"} — expected ${shipment.expectedDeliveryDate}.`,
      warehouseId,
    });
  }

  for (const co of customerOrders) {
    if (co.status !== "fulfilled" || !co.fulfilledDate) continue;
    if (!isWithinTrailingWindow(co.fulfilledDate, ACTIVITY_WINDOW_DAYS)) continue;
    const units = co.lines.reduce((sum, line) => sum + line.quantity, 0);
    const value = co.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    if (value < NOTABLE_ORDER_VALUE) continue;
    events.push({
      id: `ACT-CO-${co.id}`,
      type: "customer_order_fulfilled",
      date: co.fulfilledDate,
      title: "Order fulfilled",
      description: `${co.orderNumber} fulfilled — ${units} unit${units === 1 ? "" : "s"}, $${Math.round(value).toLocaleString()}.`,
      productId: co.lines.length === 1 ? co.lines[0].productId : undefined,
      warehouseId: co.warehouseId,
    });
  }

  for (const txn of transactions) {
    if (txn.type !== "ADJUSTMENT" || txn.quantity < NOTABLE_ADJUSTMENT_QTY) continue;
    if (!isWithinTrailingWindow(txn.date, ACTIVITY_WINDOW_DAYS)) continue;
    const product = productById.get(txn.productId);
    const warehouse = warehouseById.get(txn.warehouseId);
    events.push({
      id: `ACT-ADJ-${txn.id}`,
      type: "inventory_adjustment",
      date: txn.date,
      title: "Inventory adjustment",
      description: `${txn.quantity}-unit adjustment for ${product?.sku ?? txn.productId} at ${warehouse?.code ?? txn.warehouseId}.`,
      productId: txn.productId,
      warehouseId: txn.warehouseId,
    });
  }

  events.sort((a, b) => (a.date === b.date ? TYPE_RANK[a.type] - TYPE_RANK[b.type] : a.date < b.date ? 1 : -1));

  return events.slice(0, limit);
}
