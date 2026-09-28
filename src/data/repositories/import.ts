import { prisma } from "@/lib/prisma";
import { parseTemplateRows, type TemplateRejectedRow, type TemplateType } from "@/lib/importer/template-rows";
import { EMPTY_TALLY, readImportKey, sameDay, sameMoney, tallyChanges, type TemplateImportTally } from "@/lib/importer/template-import";

/**
 * 6-file template import. Rows with a blank or invalid required value are
 * rejected with "Row N, column X: reason" and nothing is written for them;
 * the valid rows are written in one transaction. No value is invented (a
 * blank quantity never becomes 0, a blank date never becomes today) — see
 * src/lib/importer/template-rows.ts.
 *
 * Each result says how many records were added, updated or unchanged, so a
 * repeat import says so. Transactions carry an import key (built in the
 * browser over the whole file, see lib/importer/template-import.ts); a row
 * whose key is already saved is skipped, so re-importing a file never
 * duplicates the ledger.
 */
export async function importData(
  orgId: string,
  type: TemplateType,
  rows: Record<string, unknown>[],
  options: { clearExisting: boolean; firstRowNumber?: number }
): Promise<
  | { success: true; count: number; rejected: TemplateRejectedRow[]; tally: TemplateImportTally }
  | { success: false; error: string; rejected: TemplateRejectedRow[] }
> {
  const firstRowNumber = options.firstRowNumber ?? 2;
  const rejected: TemplateRejectedRow[] = [];

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
        let tally: TemplateImportTally = { ...EMPTY_TALLY };

        if (type === "warehouses") {
          const parsed = parseTemplateRows("warehouses", rows, firstRowNumber);
          rejected.push(...parsed.rejected);
          const incoming = parsed.records.map((r) => r.record);
          const saved = await tx.warehouse.findMany({
            where: { orgId, code: { in: incoming.map((w) => w.code) } },
            select: { code: true, name: true, capacityUnits: true },
          });
          tally = tallyChanges(incoming, (w) => w.code, new Map(saved.map((w) => [w.code, w])), (a, b) =>
            a.name === b.name && a.capacityUnits === b.capacityUnits
          );
          for (const { record: w } of parsed.records) {
            await tx.warehouse.upsert({
              where: { orgId_code: { orgId, code: w.code } },
              create: { orgId, ...w },
              update: { name: w.name, capacityUnits: w.capacityUnits },
            });
            count++;
          }
        } else if (type === "suppliers") {
          const parsed = parseTemplateRows("suppliers", rows, firstRowNumber);
          rejected.push(...parsed.rejected);
          const incoming = parsed.records.map((r) => r.record);
          const saved = await tx.supplier.findMany({
            where: { orgId, supplierId: { in: incoming.map((s) => s.supplierId) } },
            select: { supplierId: true, name: true, leadTimeDays: true, leadTimeMissing: true, email: true },
          });
          tally = tallyChanges(incoming, (s) => s.supplierId, new Map(saved.map((s) => [s.supplierId, s])), (a, b) =>
            a.name === b.name && a.leadTimeDays === b.leadTimeDays && a.leadTimeMissing === b.leadTimeMissing && a.email === b.email
          );
          for (const { record: s } of parsed.records) {
            await tx.supplier.upsert({
              where: { orgId_supplierId: { orgId, supplierId: s.supplierId } },
              create: { orgId, ...s },
              update: { name: s.name, leadTimeDays: s.leadTimeDays, leadTimeMissing: s.leadTimeMissing, email: s.email },
            });
            count++;
          }
        } else if (type === "products") {
          const parsed = parseTemplateRows("products", rows, firstRowNumber);
          rejected.push(...parsed.rejected);
          // Preload suppliers for O(1) lookup
          const existingSuppliers = await tx.supplier.findMany({ where: { orgId }, select: { supplierId: true } });
          const supplierSet = new Set(existingSuppliers.map((s) => s.supplierId));
          const incoming = parsed.records.map((r) => r.record);
          const saved = await tx.product.findMany({
            where: { orgId, sku: { in: incoming.map((p) => p.sku) } },
            select: { sku: true, name: true, category: true, unitCost: true, supplierId: true },
          });
          tally = tallyChanges(
            incoming,
            (p) => p.sku,
            new Map(saved.map((p) => [p.sku, { ...p, unitCost: Number(p.unitCost) }])),
            (a, b) => a.name === b.name && a.category === b.category && sameMoney(a.unitCost, b.unitCost) && a.supplierId === b.supplierId
          );

          for (const { record: p } of parsed.records) {
            if (!supplierSet.has(p.supplierId)) {
              throw new Error(`Supplier with ID '${p.supplierId}' does not exist. Please import Suppliers before Products.`);
            }
            await tx.product.upsert({
              where: { orgId_sku: { orgId, sku: p.sku } },
              create: { orgId, ...p },
              update: { name: p.name, category: p.category, unitCost: p.unitCost, supplierId: p.supplierId },
            });
            count++;
          }
        } else if (type === "inventory") {
          const parsed = parseTemplateRows("inventory", rows, firstRowNumber);
          rejected.push(...parsed.rejected);
          // Preload products & warehouses for O(1) in-memory lookup
          const [products, warehouses] = await Promise.all([
            tx.product.findMany({ where: { orgId }, select: { sku: true } }),
            tx.warehouse.findMany({ where: { orgId }, select: { id: true, code: true } }),
          ]);
          const productSet = new Set(products.map((p) => p.sku));
          const warehouseMap = new Map(warehouses.map((w) => [w.code, w.id]));
          const warehouseCodeById = new Map(warehouses.map((w) => [w.id, w.code]));
          const incoming = parsed.records.map((r) => r.record);
          const saved = await tx.inventory.findMany({
            where: { orgId, sku: { in: incoming.map((i) => i.sku) } },
            select: { sku: true, warehouseId: true, quantityOnHand: true },
          });
          tally = tallyChanges(
            incoming,
            (i) => `${i.sku}|${i.warehouseCode}`,
            new Map(
              saved.map((i) => {
                const warehouseCode = warehouseCodeById.get(i.warehouseId) ?? "";
                return [`${i.sku}|${warehouseCode}`, { sku: i.sku, warehouseCode, quantityOnHand: i.quantityOnHand }];
              })
            ),
            (a, b) => a.quantityOnHand === b.quantityOnHand
          );

          for (const { record: inv } of parsed.records) {
            if (!productSet.has(inv.sku)) {
              throw new Error(`Product SKU '${inv.sku}' does not exist. Please import Products before Inventory.`);
            }
            const warehouseId = warehouseMap.get(inv.warehouseCode);
            if (!warehouseId) {
              throw new Error(`Warehouse code '${inv.warehouseCode}' does not exist. Please import Warehouses before Inventory.`);
            }
            await tx.inventory.upsert({
              where: { orgId_sku_warehouseId: { orgId, sku: inv.sku, warehouseId } },
              create: { orgId, sku: inv.sku, warehouseId, quantityOnHand: inv.quantityOnHand },
              update: { quantityOnHand: inv.quantityOnHand },
            });
            count++;
          }
        } else if (type === "purchase_orders") {
          const parsed = parseTemplateRows("purchase_orders", rows, firstRowNumber);
          rejected.push(...parsed.rejected);
          // Preload products & suppliers for fast lookup
          const [products, suppliers] = await Promise.all([
            tx.product.findMany({ where: { orgId }, select: { sku: true } }),
            tx.supplier.findMany({ where: { orgId }, select: { supplierId: true } }),
          ]);
          const productSet = new Set(products.map((p) => p.sku));
          const supplierSet = new Set(suppliers.map((s) => s.supplierId));
          const incoming = parsed.records.map((r) => r.record);
          const saved = await tx.purchaseOrder.findMany({
            where: { orgId, poNumber: { in: incoming.map((po) => po.poNumber) } },
            select: { poNumber: true, supplierId: true, sku: true, quantity: true, unitPrice: true, orderDate: true, expectedDate: true, receivedDate: true },
          });
          tally = tallyChanges(
            incoming,
            (po) => po.poNumber,
            new Map(saved.map((po) => [po.poNumber, { ...po, unitPrice: Number(po.unitPrice) }])),
            (a, b) =>
              a.supplierId === b.supplierId &&
              a.sku === b.sku &&
              a.quantity === b.quantity &&
              sameMoney(a.unitPrice, b.unitPrice) &&
              sameDay(a.orderDate, b.orderDate) &&
              sameDay(a.expectedDate, b.expectedDate) &&
              sameDay(a.receivedDate, b.receivedDate)
          );

          for (const { record: po } of parsed.records) {
            if (!productSet.has(po.sku)) {
              throw new Error(`Product SKU '${po.sku}' does not exist. Please import Products before Purchase Orders.`);
            }
            if (!supplierSet.has(po.supplierId)) {
              throw new Error(`Supplier '${po.supplierId}' does not exist. Please import Suppliers before Purchase Orders.`);
            }
            const { poNumber, ...fields } = po;
            await tx.purchaseOrder.upsert({
              where: { orgId_poNumber: { orgId, poNumber } },
              create: { orgId, poNumber, ...fields },
              update: fields,
            });
            count++;
          }
        } else if (type === "transactions") {
          const parsed = parseTemplateRows("transactions", rows, firstRowNumber);
          rejected.push(...parsed.rejected);
          // Preload products & warehouses in memory — enables importing thousands of rows in milliseconds
          const [products, warehouses] = await Promise.all([
            tx.product.findMany({ where: { orgId }, select: { sku: true } }),
            tx.warehouse.findMany({ where: { orgId }, select: { id: true, code: true } }),
          ]);
          const productSet = new Set(products.map((p) => p.sku));
          const warehouseMap = new Map(warehouses.map((w) => [w.code, w.id]));

          const insertData: {
            orgId: string;
            sku: string;
            warehouseId: number;
            quantity: number;
            direction: "IN" | "OUT";
            date: Date;
            importKey: string | null;
          }[] = [];
          for (const { rowNumber, record: t } of parsed.records) {
            if (!productSet.has(t.sku)) {
              throw new Error(`Product SKU '${t.sku}' does not exist. Please import Products before Transactions.`);
            }
            const warehouseId = warehouseMap.get(t.warehouseCode);
            if (!warehouseId) {
              throw new Error(`Warehouse code '${t.warehouseCode}' does not exist. Please import Warehouses before Transactions.`);
            }
            const importKey = readImportKey(rows[rowNumber - firstRowNumber]);
            insertData.push({ orgId, sku: t.sku, warehouseId, quantity: t.quantity, direction: t.direction, date: t.date, importKey });
          }

          // Bulk insert in chunks of 1000 for high stability & speed. A row whose
          // import key is already saved (an earlier import of the same file) is
          // skipped, not duplicated; a row without a key is always inserted.
          const CHUNK_SIZE = 1000;
          let inserted = 0;
          for (let i = 0; i < insertData.length; i += CHUNK_SIZE) {
            const res = await tx.transaction.createMany({ data: insertData.slice(i, i + CHUNK_SIZE), skipDuplicates: true });
            inserted += res.count;
          }
          count = inserted;
          tally = { ...EMPTY_TALLY, added: inserted, skipped: insertData.length - inserted };
        }

        return { success: true as const, count, rejected, tally };
      },
      { timeout: 60000 } // 60-second transaction budget for large multi-thousand datasets
    );
  } catch (error) {
    console.error("Import error details:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred", rejected };
  }
}
