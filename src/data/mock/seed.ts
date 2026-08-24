import type {
  Company,
  Customer,
  CustomerOrder,
  CustomerOrderLine,
  InventoryRecord,
  InventoryTransaction,
  InventoryTransactionType,
  Product,
  ProductCategory,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderStatus,
  Shipment,
  Supplier,
  Warehouse,
} from "@/types/supply-chain";
import { createRng, randInt, randFloat, pick, weightedPick, chance, type Rng } from "./random";
import { offsetDate, addDays, REFERENCE_DATE } from "./dates";
import {
  SUPPLIER_NAMES,
  SUPPLIER_COUNTRIES,
  WAREHOUSES,
  PRODUCT_CATEGORY_WEIGHTS,
  PRODUCT_NAMES_BY_CATEGORY,
  UNIT_OF_MEASURE_BY_CATEGORY,
  CARRIERS,
  CUSTOMER_NAME_PREFIXES,
  CUSTOMER_NAME_SUFFIXES,
  CONTACT_FIRST_NAMES,
  CONTACT_LAST_NAMES,
} from "./catalog";

/** The dataset is fully determined by this seed — never Math.random(). */
export const SEED = 48291;

const HISTORY_DAYS = 365; // ~12 months of history, relative to REFERENCE_DATE

export type Velocity = "fast" | "medium" | "slow" | "dead";

const VELOCITY_WEIGHTS: [Velocity, number][] = [
  ["fast", 15],
  ["medium", 45],
  ["slow", 25],
  ["dead", 15],
];

const VELOCITY_DAILY_RANGE: Record<Velocity, [number, number]> = {
  fast: [5, 25],
  medium: [1, 5],
  slow: [0.1, 1],
  dead: [0, 0],
};

const VELOCITY_ORDER_WEIGHT: Record<Velocity, number> = {
  fast: 12,
  medium: 4,
  slow: 1,
  dead: 0,
};

const CATEGORY_COST_RANGE: Record<ProductCategory, [number, number]> = {
  raw_material: [1, 25],
  component: [3, 60],
  finished_good: [8, 250],
  packaging: [0.2, 5],
  mro: [5, 150],
};

interface ProductMeta {
  product: Product;
  velocity: Velocity;
  targetDailyDemand: number;
  warehouseIds: string[]; // warehouses this product is stocked in
}

export interface SeedData {
  company: Company;
  suppliers: Supplier[];
  warehouses: Warehouse[];
  products: Product[];
  customers: Customer[];
  purchaseOrders: PurchaseOrder[];
  customerOrders: CustomerOrder[];
  shipments: Shipment[];
  inventoryTransactions: InventoryTransaction[];
  inventoryRecords: InventoryRecord[];
  /** Internal generation metadata, exposed for repositories that need velocity context. */
  productMeta: Map<string, ProductMeta>;
}

function id(prefix: string, n: number, width = 4): string {
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

function buildSuppliers(rng: Rng): Supplier[] {
  return SUPPLIER_NAMES.map((name, i) => {
    const leadTimeDays = randInt(rng, 4, 45);
    const terms = pick(rng, ["Net 15", "Net 30", "Net 45", "Net 60"]);
    const first = pick(rng, CONTACT_FIRST_NAMES);
    const last = pick(rng, CONTACT_LAST_NAMES);
    return {
      id: id("SUP", i + 1, 3),
      name,
      country: pick(rng, SUPPLIER_COUNTRIES),
      leadTimeDays,
      paymentTerms: terms,
      contactName: `${first} ${last}`,
      contactEmail: `${first.toLowerCase()}.${last.toLowerCase()}@${name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
      active: chance(rng, 0.95),
      createdAt: `${offsetDate(-randInt(rng, 400, 1400))}T00:00:00Z`,
    };
  });
}

function buildWarehouses(): Warehouse[] {
  return WAREHOUSES.map((w, i) => ({
    id: id("WH", i + 1, 2),
    name: w.name,
    code: w.code,
    city: w.city,
    country: w.country,
    type: w.type,
    capacityUnits: [40000, 25000, 25000, 30000, 12000, 18000][i] ?? 20000,
    active: true,
  }));
}

function buildProducts(rng: Rng, suppliers: Supplier[], warehouses: Warehouse[]): ProductMeta[] {
  const activeSuppliers = suppliers.filter((s) => s.active);
  const skuCounters: Record<string, number> = {};
  const metas: ProductMeta[] = [];

  for (let i = 0; i < 150; i++) {
    const category = weightedPick(rng, PRODUCT_CATEGORY_WEIGHTS as [ProductCategory, number][]);
    const names = PRODUCT_NAMES_BY_CATEGORY[category];
    const baseName = pick(rng, names);
    skuCounters[category] = (skuCounters[category] ?? 0) + 1;
    const catCode = category.slice(0, 2).toUpperCase();
    const sku = `${catCode}-${String(skuCounters[category]).padStart(4, "0")}`;

    const [costMin, costMax] = CATEGORY_COST_RANGE[category];
    const unitCost = randFloat(rng, costMin, costMax, 2);
    const markup = randFloat(rng, 1.3, 2.4, 2);
    const unitPrice = category === "raw_material" || category === "mro"
      ? 0
      : Math.round(unitCost * markup * 100) / 100;

    const supplier = pick(rng, activeSuppliers);
    const velocity = weightedPick(rng, VELOCITY_WEIGHTS);
    const [dMin, dMax] = VELOCITY_DAILY_RANGE[velocity];
    const targetDailyDemand = velocity === "dead" ? 0 : randFloat(rng, dMin, dMax, 2);

    const active = chance(rng, 0.93);

    const product: Product = {
      id: id("PRD", i + 1, 4),
      sku,
      name: `${baseName} ${sku}`,
      category,
      unitCost,
      unitPrice,
      primarySupplierId: supplier.id,
      unitOfMeasure: pick(rng, UNIT_OF_MEASURE_BY_CATEGORY[category]),
      active,
      createdAt: `${offsetDate(-randInt(rng, 30, 1200))}T00:00:00Z`,
    };

    // Most products live in one warehouse; higher-velocity products are more
    // likely to be stocked in multiple locations.
    const stockCount = velocity === "fast" ? weightedPick(rng, [[1, 3], [2, 5], [3, 4]] as [number, number][])
      : velocity === "medium" ? weightedPick(rng, [[1, 6], [2, 3]] as [number, number][])
      : 1;
    const shuffled = [...warehouses].sort(() => rng() - 0.5);
    const warehouseIds = shuffled.slice(0, Math.min(stockCount, warehouses.length)).map((w) => w.id);

    metas.push({ product, velocity, targetDailyDemand, warehouseIds });
  }

  return metas;
}

function buildCustomers(rng: Rng): Customer[] {
  const customers: Customer[] = [];
  for (let i = 0; i < 90; i++) {
    const name = `${pick(rng, CUSTOMER_NAME_PREFIXES)} ${pick(rng, CUSTOMER_NAME_SUFFIXES)}`;
    customers.push({
      id: id("CUS", i + 1, 4),
      name,
      country: pick(rng, SUPPLIER_COUNTRIES),
      createdAt: `${offsetDate(-randInt(rng, 30, 1400))}T00:00:00Z`,
    });
  }
  return customers;
}

/** Each supplier gets a stable reliability profile driving OTIF outcomes. */
function buildSupplierReliability(rng: Rng, suppliers: Supplier[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of suppliers) {
    // Most suppliers are decent (0.80-0.97); a handful are problem suppliers (0.50-0.75).
    const reliability = chance(rng, 0.2) ? randFloat(rng, 0.5, 0.75, 2) : randFloat(rng, 0.8, 0.97, 2);
    map.set(s.id, reliability);
  }
  return map;
}

function pairKey(productId: string, warehouseId: string): string {
  return `${productId}::${warehouseId}`;
}

/**
 * Measures actual realized demand from the generated customer orders,
 * rather than trusting the fictional `targetDailyDemand` used only to
 * bias product selection. Purchase orders are sized against this real
 * number so supply and demand stay in balance — otherwise the inventory
 * classifier (which measures demand from real SALE transactions) would
 * drift out of sync with however much stock was actually purchased in.
 */
function computeRealizedDailyDemand(
  customerOrders: CustomerOrder[],
  productMetas: ProductMeta[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const co of customerOrders) {
    if (co.status !== "fulfilled") continue;
    for (const line of co.lines) {
      const k = pairKey(line.productId, co.warehouseId);
      totals.set(k, (totals.get(k) ?? 0) + line.quantity);
    }
  }

  const result = new Map<string, number>();
  for (const meta of productMetas) {
    for (const warehouseId of meta.warehouseIds) {
      const k = pairKey(meta.product.id, warehouseId);
      result.set(k, (totals.get(k) ?? 0) / HISTORY_DAYS);
    }
  }
  return result;
}

interface ReplenishEvent {
  productId: string;
  warehouseId: string;
  supplierId: string;
  unitCost: number;
  offset: number; // days before REFERENCE_DATE (negative)
  quantity: number;
}

/**
 * One replenishment event per (product, warehouse) roughly every
 * cycleDays, evenly spaced across the year (with jitter) rather than
 * placed on a uniform-random date. Uniform-random order dates sound
 * "realistic" but actually produce highly uneven gaps between
 * consecutive orders for the same SKU (classic order-statistics
 * burstiness) — a snapshot at REFERENCE_DATE would then land mostly in
 * the extremes (just restocked, or long overdue) instead of the healthy
 * middle of a cycle, which is where well-run reorder-point inventory
 * actually spends most of its time.
 */
function buildReplenishEvents(
  rng: Rng,
  productMetas: ProductMeta[],
  suppliers: Supplier[],
  realizedDailyDemand: Map<string, number>,
): ReplenishEvent[] {
  const events: ReplenishEvent[] = [];
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  for (const meta of productMetas) {
    if (meta.velocity === "dead") continue;

    const leadTimeDays = supplierById.get(meta.product.primarySupplierId)?.leadTimeDays ?? 14;

    // Cycle length mirrors the overstock-threshold formula itself
    // (safetyStock + 30 days of demand, i.e. 0.5×leadTime + 30 days) so a
    // fresh delivery lands at or just under that threshold rather than
    // structurally blowing past it — which is what a longer, arbitrary
    // cycle would do regardless of how well-run the reorder policy is.
    const cycleDays = Math.round((leadTimeDays * 0.5 + 30) * randFloat(rng, 0.85, 1.05, 2));

    for (const warehouseId of meta.warehouseIds) {
      const demand = realizedDailyDemand.get(pairKey(meta.product.id, warehouseId)) ?? 0;
      if (demand <= 0) continue;

      // Each pair gets its own random cycle phase — without this, every
      // pair's most recent delivery lands the same number of days before
      // REFERENCE_DATE, so the whole dataset gets snapshotted at the same
      // point in its depletion curve (all "just past half-empty" at
      // once). Real replenishment schedules across hundreds of SKUs are
      // not synchronized like that.
      let offset = -randInt(rng, 0, cycleDays - 1);
      while (offset >= -HISTORY_DAYS) {
        const jitter = randInt(rng, -4, 4);
        const eventOffset = Math.min(-1, Math.max(-HISTORY_DAYS, offset + jitter));
        // Aim at or just under the cycle target (== the overstock
        // threshold) rather than over it, since cycleDays already equals
        // that threshold expressed in days of demand.
        const quantity = Math.max(10, Math.round(demand * cycleDays * randFloat(rng, 0.75, 0.98, 2)));
        events.push({
          productId: meta.product.id,
          warehouseId,
          supplierId: meta.product.primarySupplierId,
          // Small deliberate variance from the product's baseline cost so
          // the price-stability metric has something real to measure.
          unitCost: Math.round(meta.product.unitCost * randFloat(rng, 0.92, 1.12, 4) * 100) / 100,
          offset: eventOffset,
          quantity,
        });
        offset -= cycleDays;
      }
    }
  }

  return events;
}

/** Groups replenishment events into purchase orders (≤4 lines, same supplier + warehouse). */
function buildPurchaseOrders(
  rng: Rng,
  suppliers: Supplier[],
  warehouses: Warehouse[],
  productMetas: ProductMeta[],
  reliability: Map<string, number>,
  realizedDailyDemand: Map<string, number>,
): PurchaseOrder[] {
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));
  const events = buildReplenishEvents(rng, productMetas, suppliers, realizedDailyDemand);

  const groups = new Map<string, ReplenishEvent[]>();
  for (const ev of events) {
    const k = `${ev.supplierId}::${ev.warehouseId}`;
    const list = groups.get(k) ?? [];
    list.push(ev);
    groups.set(k, list);
  }

  const orders: PurchaseOrder[] = [];
  let poCounter = 0;
  let lineCounter = 0;

  for (const [key, groupEvents] of groups) {
    const [supplierId, warehouseId] = key.split("::");
    const supplier = supplierById.get(supplierId);
    if (!supplier || !supplier.active) continue;

    const rel = reliability.get(supplier.id) ?? 0.85;
    const sorted = [...groupEvents].sort((a, b) => a.offset - b.offset);

    let idx = 0;
    while (idx < sorted.length) {
      const chunkSize = Math.min(sorted.length - idx, randInt(rng, 2, 7));
      const chunk = sorted.slice(idx, idx + chunkSize);
      idx += chunkSize;

      poCounter++;
      const orderedOffset = Math.round(chunk.reduce((s, e) => s + e.offset, 0) / chunk.length);
      const orderedDate = offsetDate(orderedOffset);
      const expectedDeliveryDate = offsetDate(orderedOffset + supplier.leadTimeDays);
      const isDue = expectedDeliveryDate <= REFERENCE_DATE;

      let status: PurchaseOrderStatus;
      let actualDeliveryDate: string | undefined;

      if (!isDue) {
        status = chance(rng, 0.7) ? "sent" : "approved";
      } else if (chance(rng, 0.03)) {
        status = "cancelled";
      } else {
        const onTime = chance(rng, rel);
        const varianceDays = onTime ? -randInt(rng, 0, 1) : randInt(rng, 1, 14);
        const rawActual = addDays(expectedDeliveryDate, varianceDays);
        actualDeliveryDate = rawActual > REFERENCE_DATE ? REFERENCE_DATE : rawActual;
        status = "received";
      }

      const lines: PurchaseOrderLine[] = chunk.map((ev) => {
        lineCounter++;
        const inFullChance = status === "received" ? rel + 0.1 : 1;
        const receivedQuantity =
          status === "received"
            ? chance(rng, Math.min(inFullChance, 0.98))
              ? ev.quantity
              : Math.round(ev.quantity * randFloat(rng, 0.6, 0.95, 2))
            : 0;
        return {
          id: id("POL", lineCounter, 5),
          purchaseOrderId: id("PO", poCounter, 4),
          productId: ev.productId,
          orderedQuantity: ev.quantity,
          receivedQuantity,
          unitCost: ev.unitCost,
        };
      });

      const purchaseOrderValue = Math.round(lines.reduce((s, l) => s + l.orderedQuantity * l.unitCost, 0) * 100) / 100;

      orders.push({
        id: id("PO", poCounter, 4),
        poNumber: `PO-${2025_000 + poCounter}`,
        supplierId: supplier.id,
        warehouseId,
        status,
        orderedDate,
        expectedDeliveryDate,
        actualDeliveryDate,
        purchaseOrderValue,
        lines,
      });
    }
  }

  return orders;
}

function buildCustomerOrders(
  rng: Rng,
  customers: Customer[],
  warehouses: Warehouse[],
  productMetas: ProductMeta[],
): CustomerOrder[] {
  const sellable = productMetas.filter((m) => m.velocity !== "dead" && m.product.active);

  // Precompute, per warehouse, the sellable products actually stocked
  // there — an order line must only reference stock the order's warehouse
  // has, or the sale would deplete a warehouse with no InventoryRecord to
  // absorb it.
  const weightedByWarehouse = new Map<string, [ProductMeta, number][]>();
  for (const warehouse of warehouses) {
    const inStock = sellable.filter((m) => m.warehouseIds.includes(warehouse.id));
    weightedByWarehouse.set(
      warehouse.id,
      inStock.map((m) => [m, VELOCITY_ORDER_WEIGHT[m.velocity]] as [ProductMeta, number]),
    );
  }

  const orders: CustomerOrder[] = [];
  let lineCounter = 0;

  for (let i = 0; i < 2000; i++) {
    const customer = pick(rng, customers);
    const warehouse = pick(rng, warehouses);
    const weighted = weightedByWarehouse.get(warehouse.id) ?? [];
    if (weighted.length === 0) continue;
    const orderedOffset = -randInt(rng, 0, HISTORY_DAYS);
    const orderDate = offsetDate(orderedOffset);

    const isRecent = orderedOffset > -5;
    const status = isRecent ? weightedPick(rng, [["open", 6], ["fulfilled", 3]] as [
      CustomerOrder["status"],
      number,
    ][]) : chance(rng, 0.03) ? "cancelled" : "fulfilled";

    const fulfilledDate = status === "fulfilled" ? offsetDate(orderedOffset + randInt(rng, 0, 3)) : undefined;

    const lineCount = randInt(rng, 1, 3);
    const lines: CustomerOrderLine[] = [];
    const usedProducts = new Set<string>();
    for (let l = 0; l < lineCount; l++) {
      const meta = weightedPick(rng, weighted);
      if (usedProducts.has(meta.product.id)) continue;
      usedProducts.add(meta.product.id);
      lineCounter++;
      const [dMin, dMax] = VELOCITY_DAILY_RANGE[meta.velocity];
      const quantity = Math.max(1, Math.round(randFloat(rng, dMin, dMax * 3, 1) * randFloat(rng, 1, 4, 1)));
      lines.push({
        id: id("COL", lineCounter, 6),
        customerOrderId: id("CO", i + 1, 5),
        productId: meta.product.id,
        quantity,
        unitPrice: meta.product.unitPrice || meta.product.unitCost * 1.5,
      });
    }

    if (lines.length === 0) continue;

    orders.push({
      id: id("CO", i + 1, 5),
      orderNumber: `SO-${100000 + i + 1}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      orderDate,
      fulfilledDate,
      status,
      lines,
    });
  }

  return orders;
}

function buildShipments(
  rng: Rng,
  purchaseOrders: PurchaseOrder[],
  customerOrders: CustomerOrder[],
): Shipment[] {
  const shipments: Shipment[] = [];
  let n = 0;

  // "delayed" means currently overdue and not yet delivered — a live
  // problem. A shipment that arrived late is still "delivered"; its
  // lateness is derived separately via isShipmentOnTime(), not baked
  // into the status, so a months-old late delivery doesn't read as an
  // open issue today.
  const inboundEligible = purchaseOrders.filter((po) => po.status === "received" || po.status === "sent");
  for (const po of inboundEligible) {
    n++;
    const status: Shipment["status"] =
      po.status === "received"
        ? "delivered"
        : po.expectedDeliveryDate < REFERENCE_DATE
          ? "delayed"
          : chance(rng, 0.5)
            ? "in_transit"
            : "pending";
    shipments.push({
      id: id("SHP", n, 4),
      shipmentNumber: `SHP-IN-${10000 + n}`,
      direction: "inbound",
      purchaseOrderId: po.id,
      destinationWarehouseId: po.warehouseId,
      carrier: pick(rng, CARRIERS),
      status,
      shippedDate: po.orderedDate,
      expectedDeliveryDate: po.expectedDeliveryDate,
      actualDeliveryDate: po.actualDeliveryDate,
    });
  }

  // Outbound shipments carry their own expected-transit-time estimate,
  // separate from the customer order's fulfillment date, so on-time
  // performance is a real (non-trivial) calculation rather than always 100%.
  const outboundEligible = customerOrders.filter((co) => co.status === "fulfilled" || co.status === "open");
  const sampled = [...outboundEligible].sort(() => rng() - 0.5).slice(0, Math.max(0, 800 - shipments.length));
  for (const co of sampled) {
    n++;
    const transitDays = randInt(rng, 1, 5);
    const expectedDeliveryDate = addDays(co.orderDate, transitDays);
    const actualDeliveryDate = co.fulfilledDate;
    const status: Shipment["status"] =
      co.status === "fulfilled"
        ? "delivered"
        : expectedDeliveryDate < REFERENCE_DATE
          ? "delayed"
          : chance(rng, 0.6)
            ? "in_transit"
            : "pending";
    shipments.push({
      id: id("SHP", n, 4),
      shipmentNumber: `SHP-OUT-${10000 + n}`,
      direction: "outbound",
      customerOrderId: co.id,
      originWarehouseId: co.warehouseId,
      carrier: pick(rng, CARRIERS),
      status,
      shippedDate: co.orderDate,
      expectedDeliveryDate,
      actualDeliveryDate,
    });
  }

  return shipments;
}

function buildTransactions(
  rng: Rng,
  purchaseOrders: PurchaseOrder[],
  customerOrders: CustomerOrder[],
  productMetas: ProductMeta[],
): InventoryTransaction[] {
  const txns: InventoryTransaction[] = [];
  let n = 0;

  const push = (
    productId: string,
    warehouseId: string,
    type: InventoryTransactionType,
    quantity: number,
    date: string,
    referenceId?: string,
  ) => {
    n++;
    txns.push({ id: id("TXN", n, 6), productId, warehouseId, type, quantity, date, referenceId });
  };

  for (const po of purchaseOrders) {
    if (po.status !== "received") continue;
    const date = po.actualDeliveryDate ?? po.expectedDeliveryDate;
    for (const line of po.lines) {
      if (line.receivedQuantity > 0) {
        push(line.productId, po.warehouseId, "RECEIPT", line.receivedQuantity, date, po.id);
      }
    }
  }

  for (const co of customerOrders) {
    if (co.status !== "fulfilled") continue;
    const date = co.fulfilledDate ?? co.orderDate;
    for (const line of co.lines) {
      push(line.productId, co.warehouseId, "SALE", line.quantity, date, co.id);
    }
  }

  // Occasional transfers between a product's stocking warehouses.
  for (const meta of productMetas) {
    if (meta.warehouseIds.length < 2) continue;
    const transferCount = randInt(rng, 0, 4);
    for (let t = 0; t < transferCount; t++) {
      const [from, to] = [...meta.warehouseIds].sort(() => rng() - 0.5).slice(0, 2);
      if (!from || !to) continue;
      const date = offsetDate(-randInt(rng, 1, HISTORY_DAYS));
      const qty = Math.max(1, Math.round(meta.targetDailyDemand * randInt(rng, 5, 20)) || randInt(rng, 10, 100));
      push(meta.product.id, from, "TRANSFER_OUT", qty, date);
      push(meta.product.id, to, "TRANSFER_IN", qty, date);
    }
  }

  // Sparse cycle-count adjustments.
  for (const meta of productMetas) {
    if (!chance(rng, 0.35)) continue;
    const warehouseId = pick(rng, meta.warehouseIds);
    const date = offsetDate(-randInt(rng, 1, HISTORY_DAYS));
    const qty = randInt(rng, 1, 25);
    push(meta.product.id, warehouseId, "ADJUSTMENT", qty, date);
  }

  return txns.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function buildInventoryRecords(
  productMetas: ProductMeta[],
  transactions: InventoryTransaction[],
  customerOrders: CustomerOrder[],
  realizedDailyDemand: Map<string, number>,
): InventoryRecord[] {
  const balances = new Map<string, number>(); // `${productId}::${warehouseId}` -> onHand
  const key = (p: string, w: string) => `${p}::${w}`;

  for (const meta of productMetas) {
    for (const wId of meta.warehouseIds) {
      // Seed a starting balance around one realized-demand cycle so
      // early-history sales don't go negative before the first receipt.
      const demand = realizedDailyDemand.get(pairKey(meta.product.id, wId)) ?? meta.targetDailyDemand;
      balances.set(key(meta.product.id, wId), Math.round(demand * 20));
    }
  }

  for (const txn of transactions) {
    const k = key(txn.productId, txn.warehouseId);
    const current = balances.get(k) ?? 0;
    const delta =
      txn.type === "RECEIPT" || txn.type === "TRANSFER_IN"
        ? txn.quantity
        : txn.type === "SALE" || txn.type === "TRANSFER_OUT"
          ? -txn.quantity
          : txn.quantity; // ADJUSTMENT: additive, can represent found/lost stock
    balances.set(k, Math.max(0, current + delta));
  }

  const reserved = new Map<string, number>();
  for (const co of customerOrders) {
    if (co.status !== "open") continue;
    for (const line of co.lines) {
      const k = key(line.productId, co.warehouseId);
      reserved.set(k, (reserved.get(k) ?? 0) + line.quantity);
    }
  }

  const records: InventoryRecord[] = [];
  let n = 0;
  for (const meta of productMetas) {
    for (const wId of meta.warehouseIds) {
      n++;
      const k = key(meta.product.id, wId);
      const onHand = Math.round(balances.get(k) ?? 0);
      const reservedQty = Math.min(onHand, Math.round(reserved.get(k) ?? 0));
      records.push({
        id: id("INV", n, 5),
        productId: meta.product.id,
        warehouseId: wId,
        quantityOnHand: onHand,
        quantityReserved: reservedQty,
        quantityAvailable: onHand - reservedQty,
        updatedAt: `${REFERENCE_DATE}T00:00:00Z`,
      });
    }
  }
  return records;
}

let cached: SeedData | null = null;

/** Builds (and memoizes) the full deterministic mock dataset. */
export function getSeedData(): SeedData {
  if (cached) return cached;

  const rng = createRng(SEED);

  const company: Company = {
    id: "COM-001",
    name: "Northline Distribution Co.",
    timezone: "America/New_York",
    createdAt: "2022-01-10T00:00:00Z",
  };

  const suppliers = buildSuppliers(rng);
  const warehouses = buildWarehouses();
  const productMetas = buildProducts(rng, suppliers, warehouses);
  const products = productMetas.map((m) => m.product);
  const customers = buildCustomers(rng);
  const reliability = buildSupplierReliability(rng, suppliers);

  // Customer orders (and the demand they imply) are generated before
  // purchase orders so PO sizing can be calibrated against *realized*
  // demand instead of the fictional target used only to weight product
  // selection — see computeRealizedDailyDemand.
  const customerOrders = buildCustomerOrders(rng, customers, warehouses, productMetas);
  const realizedDailyDemand = computeRealizedDailyDemand(customerOrders, productMetas);
  const purchaseOrders = buildPurchaseOrders(rng, suppliers, warehouses, productMetas, reliability, realizedDailyDemand);
  const shipments = buildShipments(rng, purchaseOrders, customerOrders);
  const inventoryTransactions = buildTransactions(rng, purchaseOrders, customerOrders, productMetas);
  const inventoryRecords = buildInventoryRecords(productMetas, inventoryTransactions, customerOrders, realizedDailyDemand);

  const productMeta = new Map(productMetas.map((m) => [m.product.id, m]));

  cached = {
    company,
    suppliers,
    warehouses,
    products,
    customers,
    purchaseOrders,
    customerOrders,
    shipments,
    inventoryTransactions,
    inventoryRecords,
    productMeta,
  };

  return cached;
}
