/**
 * Row parsing for the 6-file template importer (Warehouses, Suppliers,
 * Products, Inventory, Purchase Orders, Transactions).
 *
 * Nothing is invented: a blank or invalid quantity, price, cost or date
 * rejects the row with "Row N, column X: reason" — it never becomes 0 or
 * today. Pure (no database) so the server and the tests share one rule set.
 */
import { cleanDateValue, cleanNumericValue, cleanString, detectColumnDateFormat } from "./cleaner";

export type TemplateType = "warehouses" | "suppliers" | "products" | "inventory" | "purchase_orders" | "transactions";

export interface WarehouseRecord {
  code: string;
  name: string;
  capacityUnits: number;
}
export interface SupplierRecord {
  supplierId: string;
  name: string;
  leadTimeDays: number;
  leadTimeMissing: boolean;
  email: string;
}
export interface ProductRecord {
  sku: string;
  name: string;
  category: string;
  unitCost: number;
  supplierId: string;
}
export interface InventoryRecord {
  sku: string;
  warehouseCode: string;
  quantityOnHand: number;
}
export interface PurchaseOrderRecord {
  poNumber: string;
  supplierId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  orderDate: Date;
  expectedDate: Date;
  receivedDate: Date | null;
}
export interface TransactionRecord {
  sku: string;
  warehouseCode: string;
  quantity: number;
  direction: "IN" | "OUT";
  date: Date;
}

export interface TemplateRecordMap {
  warehouses: WarehouseRecord;
  suppliers: SupplierRecord;
  products: ProductRecord;
  inventory: InventoryRecord;
  purchase_orders: PurchaseOrderRecord;
  transactions: TransactionRecord;
}

export interface TemplateRejectedRow {
  /** Row number in the uploaded file (the header is row 1). */
  row: number;
  /** "Row N, column X: reason" — one or more problems joined with "; ". */
  reason: string;
}

/** Looks a field up by any of its accepted header spellings. */
function getField(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k];
  }
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const normKey = k.toLowerCase().replace(/[\s_\-()]/g, "");
    const found = rowKeys.find((rk) => rk.toLowerCase().replace(/[\s_\-()]/g, "") === normKey);
    if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== "") return row[found];
  }
  return undefined;
}

const FIELDS = {
  warehouseCode: ["Warehouse Code", "code", "warehouse_code", "warehouseCode"],
  warehouseName: ["Name", "name", "warehouse_name", "warehouseName"],
  capacity: ["Capacity (Units)", "capacityUnits", "capacity_units", "capacity"],
  supplierId: ["Supplier ID", "supplierId", "supplier_id", "vendor_id"],
  supplierName: ["Name", "name", "supplier_name", "vendor_name"],
  leadTime: ["Lead Time (Days)", "leadTimeDays", "lead_time_days", "lead_time", "leadTime"],
  email: ["Email", "email", "supplier_email", "contact_email"],
  sku: ["SKU", "sku", "item_code", "product_code", "product_sku"],
  productName: ["Name", "name", "product_name", "item_name"],
  category: ["Category", "category", "product_category"],
  unitCost: ["Unit Cost", "unitCost", "unit_cost", "cost"],
  onHand: ["Quantity On Hand", "quantityOnHand", "quantity_on_hand", "quantity", "on_hand", "onHand"],
  poNumber: ["PO Number", "poNumber", "po_number", "po", "order_number"],
  poQuantity: ["Quantity", "quantity", "qty", "ordered_quantity"],
  unitPrice: ["Unit Price", "unitPrice", "unit_price", "price"],
  orderDate: ["Order Date", "orderDate", "order_date"],
  expectedDate: ["Expected Date", "expectedDate", "expected_date", "expected_delivery"],
  receivedDate: ["Received Date", "receivedDate", "received_date", "actual_delivery"],
  txQuantity: ["Quantity", "quantity", "qty"],
  direction: ["Direction", "direction", "type", "movement"],
  txDate: ["Date", "date", "transaction_date"],
} as const;

export function parseTemplateRows<T extends TemplateType>(
  type: T,
  rows: Record<string, unknown>[],
  /** File row number of rows[0] (header = row 1, so the first data row is 2). */
  firstRowNumber = 2
): { records: { rowNumber: number; record: TemplateRecordMap[T] }[]; rejected: TemplateRejectedRow[] } {
  // Day/month order is detected once per batch from all its date cells.
  const dateCells = rows.flatMap((r) =>
    [FIELDS.orderDate, FIELDS.expectedDate, FIELDS.receivedDate, FIELDS.txDate].map((keys) => getField(r, ...keys))
  );
  const datePreference = detectColumnDateFormat(dateCells) === "MM/DD" ? "MM/DD" : "DD/MM";

  const records: { rowNumber: number; record: TemplateRecordMap[T] }[] = [];
  const rejected: TemplateRejectedRow[] = [];

  rows.forEach((row, i) => {
    const rowNumber = firstRowNumber + i;
    const problems: string[] = [];
    const problem = (column: string, reason: string) => problems.push(`column "${column}": ${reason}`);
    const show = (v: unknown) => JSON.stringify(String(v));

    const text = (column: string, keys: readonly string[], required: boolean, why = "required"): string => {
      const v = getField(row, ...keys);
      const s = v === undefined ? "" : cleanString(v);
      if (!s && required) problem(column, `is empty — ${why}`);
      return s;
    };
    const number = (
      column: string,
      keys: readonly string[],
      opts: { why: string; positive?: boolean; integer?: boolean; optional?: boolean }
    ): number | null => {
      const v = getField(row, ...keys);
      if (v === undefined) {
        if (!opts.optional) problem(column, `is empty — ${opts.why}`);
        return null;
      }
      const n = cleanNumericValue(v);
      if (n === null) return problem(column, `${show(v)} is not a number`), null;
      if (opts.positive ? n <= 0 : n < 0) return problem(column, `${show(v)} must be ${opts.positive ? "greater than 0" : "0 or more"}`), null;
      if (opts.integer && !Number.isInteger(n)) return problem(column, `${show(v)} must be a whole number`), null;
      return n;
    };
    const date = (column: string, keys: readonly string[], opts: { why: string; optional?: boolean }): Date | null => {
      const v = getField(row, ...keys);
      if (v === undefined) {
        if (!opts.optional) problem(column, `is empty, ${opts.why}`);
        return null;
      }
      const d = cleanDateValue(v, datePreference);
      if (!d) problem(column, `${show(v)} is not a valid date${opts.optional ? " (leave it blank if not received yet)" : ""}`);
      return d;
    };

    let record: unknown = null;
    switch (type) {
      case "warehouses": {
        const code = text("warehouse_code", FIELDS.warehouseCode, true);
        const name = text("name", FIELDS.warehouseName, true);
        // Capacity is optional in this template; blank is stored as 0 ("not set").
        const capacity = number("capacity_units", FIELDS.capacity, { why: "", optional: true, integer: true });
        record = { code, name, capacityUnits: capacity ?? 0 } satisfies WarehouseRecord;
        break;
      }
      case "suppliers": {
        const supplierId = text("supplier_id", FIELDS.supplierId, true);
        const name = text("name", FIELDS.supplierName, true);
        const lead = number("lead_time_days", FIELDS.leadTime, { why: "", optional: true, positive: true, integer: true });
        // A missing lead time is stored as 14 days WITH leadTimeMissing = true,
        // so the app shows it as missing rather than as a real value.
        record = {
          supplierId,
          name,
          leadTimeDays: lead ?? 14,
          leadTimeMissing: lead === null,
          email: text("email", FIELDS.email, false),
        } satisfies SupplierRecord;
        break;
      }
      case "products": {
        const sku = text("sku", FIELDS.sku, true);
        const name = text("name", FIELDS.productName, true);
        const supplierId = text("supplier_id", FIELDS.supplierId, true);
        const unitCost = number("unit_cost", FIELDS.unitCost, { why: "required (never set to 0)" });
        const category = text("category", FIELDS.category, false) || "general";
        record = { sku, name, category, unitCost: unitCost ?? 0, supplierId } satisfies ProductRecord;
        break;
      }
      case "inventory": {
        const sku = text("sku", FIELDS.sku, true);
        const warehouseCode = text("warehouse_code", FIELDS.warehouseCode, true);
        const qty = number("quantity_on_hand", FIELDS.onHand, { why: "unknown stock is not zero stock", integer: true });
        record = { sku, warehouseCode, quantityOnHand: qty ?? 0 } satisfies InventoryRecord;
        break;
      }
      case "purchase_orders": {
        const poNumber = text("po_number", FIELDS.poNumber, true, "every purchase order needs its own PO number");
        const supplierId = text("supplier_id", FIELDS.supplierId, true);
        const sku = text("sku", FIELDS.sku, true);
        const quantity = number("quantity", FIELDS.poQuantity, { why: "required (never set to 0)", positive: true, integer: true });
        const unitPrice = number("unit_price", FIELDS.unitPrice, { why: "required (never set to 0)" });
        const orderDate = date("order_date", FIELDS.orderDate, { why: "required for lead-time tracking" });
        const expectedDate = date("expected_date", FIELDS.expectedDate, { why: "required for supplier OTIF" });
        const receivedDate = date("received_date", FIELDS.receivedDate, { why: "", optional: true });
        record = {
          poNumber,
          supplierId,
          sku,
          quantity: quantity ?? 0,
          unitPrice: unitPrice ?? 0,
          orderDate: orderDate ?? new Date(NaN),
          expectedDate: expectedDate ?? new Date(NaN),
          receivedDate,
        } satisfies PurchaseOrderRecord;
        break;
      }
      case "transactions": {
        const sku = text("sku", FIELDS.sku, true);
        const warehouseCode = text("warehouse_code", FIELDS.warehouseCode, true);
        const quantity = number("quantity", FIELDS.txQuantity, { why: "required for demand history", positive: true });
        const rawDir = text("direction", FIELDS.direction, true, "must be IN or OUT").toUpperCase();
        const direction = rawDir === "IN" || rawDir === "INBOUND" ? "IN" : rawDir === "OUT" || rawDir === "OUTBOUND" ? "OUT" : null;
        if (rawDir && !direction) problem("direction", `${show(rawDir)} must be IN or OUT`);
        const when = date("date", FIELDS.txDate, { why: "required for demand history" });
        record = { sku, warehouseCode, quantity: quantity ?? 0, direction: direction ?? "IN", date: when ?? new Date(NaN) } satisfies TransactionRecord;
        break;
      }
    }

    // The placeholder values above (?? 0, NaN dates) only exist to satisfy
    // the types: any row that needed them has a problem and is rejected here,
    // so they are never written.
    if (problems.length > 0) rejected.push({ row: rowNumber, reason: `Row ${rowNumber}, ${problems.join("; ")}` });
    else records.push({ rowNumber, record: record as TemplateRecordMap[T] });
  });

  return { records, rejected };
}
