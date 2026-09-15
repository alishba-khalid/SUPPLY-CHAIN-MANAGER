import { prisma } from "@/lib/prisma";

function getField(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  // Case-insensitive, stripped spacing/punctuation match
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const normKey = k.toLowerCase().replace(/[\s_\-()]/g, "");
    const found = rowKeys.find((rk) => rk.toLowerCase().replace(/[\s_\-()]/g, "") === normKey);
    if (found && row[found] !== undefined && row[found] !== "") {
      return row[found];
    }
  }
  return undefined;
}

export function parseDateValue(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return isNaN(value.getTime()) ? new Date() : value;
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30)
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  const str = String(value).trim();
  if (!str) return new Date();

  // If numeric string like "46174.2084"
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (num > 20000 && num < 70000) {
      return new Date(Math.round((num - 25569) * 86400 * 1000));
    }
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function importData(
  orgId: string,
  type: "warehouses" | "suppliers" | "products" | "inventory" | "purchase_orders" | "transactions",
  rows: Record<string, unknown>[],
  options: { clearExisting: boolean }
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        if (options.clearExisting) {
          if (type === "warehouses") {
            await tx.inventory.deleteMany({ where: { orgId } });
            await tx.transaction.deleteMany({ where: { orgId } });
            await tx.warehouse.deleteMany({ where: { orgId } });
          } else if (type === "suppliers") {
            await tx.product.deleteMany({ where: { orgId } });
            await tx.purchaseOrder.deleteMany({ where: { orgId } });
            await tx.supplier.deleteMany({ where: { orgId } });
          } else if (type === "products") {
            await tx.inventory.deleteMany({ where: { orgId } });
            await tx.transaction.deleteMany({ where: { orgId } });
            await tx.purchaseOrder.deleteMany({ where: { orgId } });
            await tx.product.deleteMany({ where: { orgId } });
          } else if (type === "inventory") {
            await tx.inventory.deleteMany({ where: { orgId } });
          } else if (type === "purchase_orders") {
            await tx.purchaseOrder.deleteMany({ where: { orgId } });
          } else if (type === "transactions") {
            await tx.transaction.deleteMany({ where: { orgId } });
          }
        }

        let count = 0;

        if (type === "warehouses") {
          for (const row of rows) {
            const code = String(getField(row, "Warehouse Code", "code", "warehouse_code", "warehouseCode") || "").trim();
            const name = String(getField(row, "Name", "name", "warehouse_name", "warehouseName") || "").trim();
            const capacityUnits = Number(getField(row, "Capacity (Units)", "capacityUnits", "capacity_units", "capacity") || 0);

            if (!code || !name) continue;

            await tx.warehouse.upsert({
              where: { orgId_code: { orgId, code } },
              create: { orgId, code, name, capacityUnits },
              update: { name, capacityUnits },
            });
            count++;
          }
        } else if (type === "suppliers") {
          for (const row of rows) {
            const supplierId = String(getField(row, "Supplier ID", "supplierId", "supplier_id", "id", "vendor_id") || "").trim();
            const name = String(getField(row, "Name", "name", "supplier_name", "vendor_name") || "").trim();
            const rawLeadTime = getField(row, "Lead Time (Days)", "leadTimeDays", "lead_time_days", "lead_time", "leadTime");
            const leadTimeMissing = !rawLeadTime;
            const leadTimeDays = Number(rawLeadTime || 14);
            const email = String(getField(row, "Email", "email", "supplier_email", "contact_email") || "").trim();

            if (!supplierId || !name) continue;

            await tx.supplier.upsert({
              where: { orgId_supplierId: { orgId, supplierId } },
              create: { orgId, supplierId, name, leadTimeDays, leadTimeMissing, email },
              update: { name, leadTimeDays, leadTimeMissing, email },
            });
            count++;
          }
        } else if (type === "products") {
          // Preload suppliers for O(1) lookup
          const existingSuppliers = await tx.supplier.findMany({
            where: { orgId },
            select: { supplierId: true },
          });
          const supplierSet = new Set(existingSuppliers.map((s) => s.supplierId));

          for (const row of rows) {
            const sku = String(getField(row, "SKU", "sku", "item_code", "product_code", "product_sku") || "").trim();
            const name = String(getField(row, "Name", "name", "product_name", "item_name") || "").trim();
            const category = String(getField(row, "Category", "category", "product_category") || "general").trim();
            const unitCost = Number(getField(row, "Unit Cost", "unitCost", "unit_cost", "cost", "price") || 0);
            const supplierId = String(getField(row, "Supplier ID", "supplierId", "supplier_id", "vendor_id") || "").trim();

            if (!sku || !name || !supplierId) continue;

            if (!supplierSet.has(supplierId)) {
              throw new Error(`Supplier with ID '${supplierId}' does not exist. Please import Suppliers before Products.`);
            }

            await tx.product.upsert({
              where: { orgId_sku: { orgId, sku } },
              create: { orgId, sku, name, category, unitCost, supplierId },
              update: { name, category, unitCost, supplierId },
            });
            count++;
          }
        } else if (type === "inventory") {
          // Preload products & warehouses for O(1) in-memory lookup
          const [products, warehouses] = await Promise.all([
            tx.product.findMany({ where: { orgId }, select: { sku: true } }),
            tx.warehouse.findMany({ where: { orgId }, select: { id: true, code: true } }),
          ]);
          const productSet = new Set(products.map((p) => p.sku));
          const warehouseMap = new Map(warehouses.map((w) => [w.code, w.id]));

          for (const row of rows) {
            const sku = String(getField(row, "SKU", "sku", "item_code", "product_sku") || "").trim();
            const warehouseCode = String(getField(row, "Warehouse Code", "warehouseCode", "warehouse_code", "code") || "").trim();
            const quantityOnHand = Number(getField(row, "Quantity On Hand", "quantityOnHand", "quantity_on_hand", "quantity", "on_hand", "onHand") || 0);

            if (!sku || !warehouseCode) continue;

            if (!productSet.has(sku)) {
              throw new Error(`Product SKU '${sku}' does not exist. Please import Products before Inventory.`);
            }
            const warehouseId = warehouseMap.get(warehouseCode);
            if (!warehouseId) {
              throw new Error(`Warehouse code '${warehouseCode}' does not exist. Please import Warehouses before Inventory.`);
            }

            await tx.inventory.upsert({
              where: { orgId_sku_warehouseId: { orgId, sku, warehouseId } },
              create: { orgId, sku, warehouseId, quantityOnHand },
              update: { quantityOnHand },
            });
            count++;
          }
        } else if (type === "purchase_orders") {
          // Preload products & suppliers for fast lookup
          const [products, suppliers] = await Promise.all([
            tx.product.findMany({ where: { orgId }, select: { sku: true } }),
            tx.supplier.findMany({ where: { orgId }, select: { supplierId: true } }),
          ]);
          const productSet = new Set(products.map((p) => p.sku));
          const supplierSet = new Set(suppliers.map((s) => s.supplierId));

          for (const row of rows) {
            const poNumber = String(getField(row, "PO Number", "poNumber", "po_number", "po", "order_number") || "").trim();
            const supplierId = String(getField(row, "Supplier ID", "supplierId", "supplier_id", "vendor_id") || "").trim();
            const sku = String(getField(row, "SKU", "sku", "item_code", "product_sku") || "").trim();
            const quantity = Number(getField(row, "Quantity", "quantity", "qty", "ordered_quantity") || 0);
            const unitPrice = Number(getField(row, "Unit Price", "unitPrice", "unit_price", "price", "cost") || 0);

            const rawOrderDate = getField(row, "Order Date", "orderDate", "order_date", "date");
            const orderDate = parseDateValue(rawOrderDate);

            const rawExpectedDate = getField(row, "Expected Date", "expectedDate", "expected_date", "expected_delivery");
            const expectedDate = parseDateValue(rawExpectedDate);

            const rawReceivedDate = getField(row, "Received Date", "receivedDate", "received_date", "actual_delivery");
            const receivedDate = rawReceivedDate ? parseDateValue(rawReceivedDate) : null;

            if (!poNumber || !supplierId || !sku) continue;

            if (!productSet.has(sku)) {
              throw new Error(`Product SKU '${sku}' does not exist. Please import Products before Purchase Orders.`);
            }
            if (!supplierSet.has(supplierId)) {
              throw new Error(`Supplier '${supplierId}' does not exist. Please import Suppliers before Purchase Orders.`);
            }

            await tx.purchaseOrder.upsert({
              where: { orgId_poNumber: { orgId, poNumber } },
              create: { orgId, poNumber, supplierId, sku, quantity, unitPrice, orderDate, expectedDate, receivedDate },
              update: { supplierId, sku, quantity, unitPrice, orderDate, expectedDate, receivedDate },
            });
            count++;
          }
        } else if (type === "transactions") {
          // Preload products & warehouses in memory — enables importing thousands of rows in milliseconds
          const [products, warehouses] = await Promise.all([
            tx.product.findMany({ where: { orgId }, select: { sku: true } }),
            tx.warehouse.findMany({ where: { orgId }, select: { id: true, code: true } }),
          ]);
          const productSet = new Set(products.map((p) => p.sku));
          const warehouseMap = new Map(warehouses.map((w) => [w.code, w.id]));

          const insertData: { orgId: string; sku: string; warehouseId: number; quantity: number; direction: "IN" | "OUT"; date: Date }[] = [];

          for (const row of rows) {
            const sku = String(getField(row, "SKU", "sku", "item_code", "product_sku") || "").trim();
            const warehouseCode = String(getField(row, "Warehouse Code", "warehouseCode", "warehouse_code", "code") || "").trim();
            const quantity = Number(getField(row, "Quantity", "quantity", "qty") || 0);
            const rawDir = String(getField(row, "Direction", "direction", "type", "movement") || "").trim().toUpperCase();
            const direction = rawDir === "IN" || rawDir === "INBOUND" ? "IN" : rawDir === "OUT" || rawDir === "OUTBOUND" ? "OUT" : null;

            const rawDate = getField(row, "Date", "date", "transaction_date", "created_at");
            const date = parseDateValue(rawDate);

            if (!sku || !warehouseCode || !direction) continue;

            if (!productSet.has(sku)) {
              throw new Error(`Product SKU '${sku}' does not exist. Please import Products before Transactions.`);
            }
            const warehouseId = warehouseMap.get(warehouseCode);
            if (!warehouseId) {
              throw new Error(`Warehouse code '${warehouseCode}' does not exist. Please import Warehouses before Transactions.`);
            }

            insertData.push({
              orgId,
              sku,
              warehouseId,
              quantity,
              direction,
              date,
            });
          }

          if (insertData.length > 0) {
            // Bulk insert in chunks of 1000 for high stability & speed
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < insertData.length; i += CHUNK_SIZE) {
              const chunk = insertData.slice(i, i + CHUNK_SIZE);
              await tx.transaction.createMany({ data: chunk });
            }
            count = insertData.length;
          }
        }

        return { success: true, count };
      },
      { timeout: 60000 } // 60-second transaction budget for large multi-thousand datasets
    );
  } catch (error) {
    console.error("Import error details:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}
