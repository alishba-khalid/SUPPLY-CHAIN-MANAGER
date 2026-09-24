import * as XLSX from "xlsx";
import type { ImportCommitPayload } from "../src/lib/importer/types";

/**
 * Deterministic large-import fixtures for the chunked importer tests.
 *
 * ALL_IN_ONE_21586 matches the distributor file that used to hit the old
 * 5,000-row wall: 3 warehouses, 8 suppliers, 250 products, 466 stock
 * positions, 484 purchase orders and 20,375 transactions = 21,586 rows.
 * REGRESSION_4817 is the same shape at the size that already worked.
 *
 * Every 500th transaction is an exact copy of the one before it — real
 * ledgers do contain identical same-day movements, and the importer must keep
 * both (and still not duplicate them on a re-import).
 */
export type EntityCounts = {
  warehouses: number;
  suppliers: number;
  products: number;
  inventory: number;
  purchaseOrders: number;
  transactions: number;
};

export const ALL_IN_ONE_21586: EntityCounts = {
  warehouses: 3,
  suppliers: 8,
  products: 250,
  inventory: 466,
  purchaseOrders: 484,
  transactions: 20_375,
};

export const REGRESSION_4817: EntityCounts = {
  warehouses: 3,
  suppliers: 8,
  products: 250,
  inventory: 466,
  purchaseOrders: 484,
  transactions: 3_606,
};

export function totalRows(c: EntityCounts): number {
  return c.warehouses + c.suppliers + c.products + c.inventory + c.purchaseOrders + c.transactions;
}

const isoDay = (offset: number) => new Date(Date.UTC(2026, 0, 1) + offset * 86_400_000).toISOString().slice(0, 10);

export function buildImportPayload(c: EntityCounts, prefix = ""): Omit<ImportCommitPayload, "skuDuplicateResolution" | "clearExisting"> {
  const warehouses = Array.from({ length: c.warehouses }, (_, i) => ({
    code: `${prefix}WH-${i + 1}`,
    name: `${prefix}Warehouse ${i + 1}`,
    capacityUnits: 40_000 + i * 5_000,
  }));
  const suppliers = Array.from({ length: c.suppliers }, (_, i) => ({
    supplierId: `${prefix}SUP-${String(i + 1).padStart(3, "0")}`,
    name: `${prefix}Supplier ${i + 1} Trading Co`,
    leadTimeDays: 7 + i * 3,
    email: `orders${i + 1}@supplier${i + 1}.example`,
    leadTimeMissing: false,
  }));
  const products = Array.from({ length: c.products }, (_, i) => ({
    sku: `${prefix}SKU-${String(i + 1).padStart(4, "0")}`,
    name: `${prefix}Product ${i + 1}`,
    category: ["Hardware", "Electrical", "Packaging", "Chemicals"][i % 4],
    unitCost: Math.round((2 + (i % 50) * 1.37) * 100) / 100,
    supplierId: suppliers[i % c.suppliers].supplierId,
  }));
  // Unique (sku, warehouse) pairs: walk every product in warehouse 1, then 2…
  const inventory = Array.from({ length: c.inventory }, (_, i) => ({
    sku: products[i % c.products].sku,
    warehouseCode: warehouses[Math.floor(i / c.products) % c.warehouses].code,
    quantityOnHand: 50 + ((i * 37) % 900),
  }));
  const purchaseOrders = Array.from({ length: c.purchaseOrders }, (_, i) => {
    const p = products[(i * 7) % c.products];
    return {
      poNumber: `${prefix}PO-${String(i + 1).padStart(5, "0")}`,
      supplierId: p.supplierId,
      sku: p.sku,
      quantity: 100 + (i % 20) * 25,
      unitPrice: p.unitCost,
      orderDate: isoDay(i % 200),
      expectedDate: isoDay((i % 200) + 14),
      receivedDate: i % 3 === 0 ? null : isoDay((i % 200) + 12 + (i % 5)),
    };
  });
  const transactions: ImportCommitPayload["transactions"] = [];
  for (let i = 0; i < c.transactions; i++) {
    if (i > 0 && i % 500 === 0) {
      transactions.push({ ...transactions[i - 1] });
      continue;
    }
    transactions.push({
      sku: products[(i * 13) % c.products].sku,
      warehouseCode: warehouses[i % c.warehouses].code,
      quantity: 1 + (i % 40),
      direction: i % 4 === 0 ? "IN" : "OUT",
      date: isoDay(i % 270),
    });
  }
  return { warehouses, suppliers, products, inventory, purchaseOrders, transactions };
}

/** The same payload as a six-sheet .xlsx — one sheet per entity. */
export function buildAllInOneWorkbook(c: EntityCounts): Uint8Array {
  const p = buildImportPayload(c);
  const wb = XLSX.utils.book_new();
  const add = (name: string, header: string[], rows: (string | number | null)[][]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), name);
  add("Warehouses", ["Warehouse Code", "Warehouse Name", "Capacity"], p.warehouses.map((w) => [w.code, w.name, w.capacityUnits]));
  add("Suppliers", ["Supplier ID", "Supplier Name", "Lead Time Days", "Email"], p.suppliers.map((s) => [s.supplierId, s.name, s.leadTimeDays, s.email]));
  add("Products", ["SKU", "Product Name", "Category", "Unit Cost", "Supplier ID"], p.products.map((x) => [x.sku, x.name, x.category, x.unitCost, x.supplierId]));
  add("Stock", ["SKU", "Warehouse Code", "Quantity On Hand"], p.inventory.map((x) => [x.sku, x.warehouseCode, x.quantityOnHand]));
  add(
    "Purchase Orders",
    ["PO Number", "Supplier ID", "SKU", "Quantity", "Unit Price", "Order Date", "Expected Date", "Received Date"],
    p.purchaseOrders.map((x) => [x.poNumber, x.supplierId, x.sku, x.quantity, x.unitPrice, x.orderDate, x.expectedDate, x.receivedDate])
  );
  add("Transactions", ["SKU", "Warehouse Code", "Quantity", "Direction", "Date"], p.transactions.map((x) => [x.sku, x.warehouseCode, x.quantity, x.direction, x.date]));
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}
