import { prisma } from "@/lib/prisma";
import type { ImportCommitPayload, ImportCommitResult, SheetMapping } from "@/lib/importer/types";

/**
 * Executes an all-or-nothing atomic commit of all six supply chain entities
 * in a single database transaction with batch chunking for high throughput.
 */
export async function commitSmartImport(
  orgId: string,
  payload: ImportCommitPayload
): Promise<ImportCommitResult> {
  const {
    warehouses,
    suppliers,
    products,
    inventory,
    purchaseOrders,
    transactions,
    clearExisting,
  } = payload;

  let missingLeadTimeCount = 0;
  let missingCapacityCount = 0;

  for (const s of suppliers) {
    if (s.leadTimeMissing) missingLeadTimeCount++;
  }
  for (const w of warehouses) {
    if (w.capacityUnits === 0) missingCapacityCount++;
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        if (clearExisting) {
          // --- FAST PATH: Single Transaction Clean Wipe & Multi-Row Batch Inserts ---
          await tx.transaction.deleteMany({ where: { orgId } });
          await tx.purchaseOrder.deleteMany({ where: { orgId } });
          await tx.inventory.deleteMany({ where: { orgId } });
          await tx.product.deleteMany({ where: { orgId } });
          await tx.supplier.deleteMany({ where: { orgId } });
          await tx.warehouse.deleteMany({ where: { orgId } });

          // 1. Warehouses batch insert
          if (warehouses.length > 0) {
            await tx.warehouse.createMany({
              data: warehouses.map((w) => ({
                orgId,
                code: w.code,
                name: w.name,
                capacityUnits: w.capacityUnits || 50000,
              })),
            });
          }

          // 2. Suppliers batch insert
          if (suppliers.length > 0) {
            await tx.supplier.createMany({
              data: suppliers.map((s) => ({
                orgId,
                supplierId: s.supplierId,
                name: s.name,
                leadTimeDays: s.leadTimeDays || 14,
                email: s.email,
              })),
            });
          }

          // 3. Products batch insert
          if (products.length > 0) {
            await tx.product.createMany({
              data: products.map((p) => ({
                orgId,
                sku: p.sku,
                name: p.name,
                category: p.category || "General",
                unitCost: p.unitCost,
                supplierId: p.supplierId,
              })),
            });
          }

          // Preload warehouse map (code -> id) for relational FKs
          const dbWarehouses = await tx.warehouse.findMany({
            where: { orgId },
            select: { id: true, code: true },
          });
          const warehouseIdByCode = new Map(dbWarehouses.map((w) => [w.code, w.id]));

          // 4. Inventory Balances batch insert
          const invRows = inventory
            .filter((inv) => warehouseIdByCode.has(inv.warehouseCode))
            .map((inv) => ({
              orgId,
              sku: inv.sku,
              warehouseId: warehouseIdByCode.get(inv.warehouseCode)!,
              quantityOnHand: inv.quantityOnHand,
            }));
          if (invRows.length > 0) {
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < invRows.length; i += CHUNK_SIZE) {
              await tx.inventory.createMany({ data: invRows.slice(i, i + CHUNK_SIZE) });
            }
          }

          // 5. Purchase Orders batch insert
          const poRows = purchaseOrders.map((po) => ({
            orgId,
            poNumber: po.poNumber,
            supplierId: po.supplierId,
            sku: po.sku,
            quantity: po.quantity,
            unitPrice: po.unitPrice,
            orderDate: new Date(po.orderDate),
            expectedDate: new Date(po.expectedDate),
            receivedDate: po.receivedDate ? new Date(po.receivedDate) : null,
          }));
          if (poRows.length > 0) {
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < poRows.length; i += CHUNK_SIZE) {
              await tx.purchaseOrder.createMany({ data: poRows.slice(i, i + CHUNK_SIZE) });
            }
          }

          // 6. Transactions batch insert
          let transCount = 0;
          if (transactions.length > 0) {
            const txRows: {
              orgId: string;
              sku: string;
              warehouseId: number;
              quantity: number;
              direction: "IN" | "OUT";
              date: Date;
            }[] = [];

            for (const t of transactions) {
              const warehouseId = warehouseIdByCode.get(t.warehouseCode);
              if (!warehouseId) continue;
              txRows.push({
                orgId,
                sku: t.sku,
                warehouseId,
                quantity: t.quantity,
                direction: t.direction,
                date: new Date(t.date),
              });
            }

            const CHUNK_SIZE = 1000;
            for (let i = 0; i < txRows.length; i += CHUNK_SIZE) {
              await tx.transaction.createMany({ data: txRows.slice(i, i + CHUNK_SIZE) });
            }
            transCount = txRows.length;
          }

          return {
            warehousesCount: warehouses.length,
            suppliersCount: suppliers.length,
            productsCount: products.length,
            inventoryCount: invRows.length,
            purchaseOrdersCount: poRows.length,
            transactionsCount: transCount,
          };
        } else {
          // --- UPSERT PATH: Incremental / Merge Mode with Concurrent Batches ---
          const BATCH_CONCURRENCY = 20;

          // Helper for running promises in concurrent batches
          async function runInBatches<T>(items: T[], fn: (item: T) => Promise<unknown>) {
            for (let i = 0; i < items.length; i += BATCH_CONCURRENCY) {
              const batch = items.slice(i, i + BATCH_CONCURRENCY);
              await Promise.all(batch.map(fn));
            }
          }

          // 1. Warehouses
          await runInBatches(warehouses, (w) =>
            tx.warehouse.upsert({
              where: { orgId_code: { orgId, code: w.code } },
              create: {
                orgId,
                code: w.code,
                name: w.name,
                capacityUnits: w.capacityUnits || 50000,
              },
              update: {
                name: w.name,
                capacityUnits: w.capacityUnits || undefined,
              },
            })
          );

          // 2. Suppliers
          await runInBatches(suppliers, (s) =>
            tx.supplier.upsert({
              where: { orgId_supplierId: { orgId, supplierId: s.supplierId } },
              create: {
                orgId,
                supplierId: s.supplierId,
                name: s.name,
                leadTimeDays: s.leadTimeDays || 14,
                email: s.email,
              },
              update: {
                name: s.name,
                leadTimeDays: s.leadTimeDays || undefined,
                email: s.email,
              },
            })
          );

          // 3. Products
          await runInBatches(products, (p) =>
            tx.product.upsert({
              where: { orgId_sku: { orgId, sku: p.sku } },
              create: {
                orgId,
                sku: p.sku,
                name: p.name,
                category: p.category || "General",
                unitCost: p.unitCost,
                supplierId: p.supplierId,
              },
              update: {
                name: p.name,
                category: p.category || undefined,
                unitCost: p.unitCost,
                supplierId: p.supplierId,
              },
            })
          );

          // Preload warehouse map
          const dbWarehouses = await tx.warehouse.findMany({
            where: { orgId },
            select: { id: true, code: true },
          });
          const warehouseIdByCode = new Map(dbWarehouses.map((w) => [w.code, w.id]));

          // 4. Inventory
          let invCount = 0;
          await runInBatches(inventory, async (inv) => {
            const warehouseId = warehouseIdByCode.get(inv.warehouseCode);
            if (!warehouseId) return;
            await tx.inventory.upsert({
              where: {
                orgId_sku_warehouseId: {
                  orgId,
                  sku: inv.sku,
                  warehouseId,
                },
              },
              create: {
                orgId,
                sku: inv.sku,
                warehouseId,
                quantityOnHand: inv.quantityOnHand,
              },
              update: {
                quantityOnHand: inv.quantityOnHand,
              },
            });
            invCount++;
          });

          // 5. Purchase Orders
          let poCount = 0;
          await runInBatches(purchaseOrders, async (po) => {
            await tx.purchaseOrder.upsert({
              where: { orgId_poNumber: { orgId, poNumber: po.poNumber } },
              create: {
                orgId,
                poNumber: po.poNumber,
                supplierId: po.supplierId,
                sku: po.sku,
                quantity: po.quantity,
                unitPrice: po.unitPrice,
                orderDate: new Date(po.orderDate),
                expectedDate: new Date(po.expectedDate),
                receivedDate: po.receivedDate ? new Date(po.receivedDate) : null,
              },
              update: {
                supplierId: po.supplierId,
                sku: po.sku,
                quantity: po.quantity,
                unitPrice: po.unitPrice,
                orderDate: new Date(po.orderDate),
                expectedDate: new Date(po.expectedDate),
                receivedDate: po.receivedDate ? new Date(po.receivedDate) : null,
              },
            });
            poCount++;
          });

          // 6. Transactions
          let transCount = 0;
          if (transactions.length > 0) {
            const txRows: {
              orgId: string;
              sku: string;
              warehouseId: number;
              quantity: number;
              direction: "IN" | "OUT";
              date: Date;
            }[] = [];

            for (const t of transactions) {
              const warehouseId = warehouseIdByCode.get(t.warehouseCode);
              if (!warehouseId) continue;
              txRows.push({
                orgId,
                sku: t.sku,
                warehouseId,
                quantity: t.quantity,
                direction: t.direction,
                date: new Date(t.date),
              });
            }

            const CHUNK_SIZE = 1000;
            for (let i = 0; i < txRows.length; i += CHUNK_SIZE) {
              await tx.transaction.createMany({ data: txRows.slice(i, i + CHUNK_SIZE) });
            }
            transCount = txRows.length;
          }

          return {
            warehousesCount: warehouses.length,
            suppliersCount: suppliers.length,
            productsCount: products.length,
            inventoryCount: invCount,
            purchaseOrdersCount: poCount,
            transactionsCount: transCount,
          };
        }
      },
      { timeout: 60000 }
    );

    return {
      success: true,
      importedCounts: {
        warehouses: result.warehousesCount,
        suppliers: result.suppliersCount,
        products: result.productsCount,
        inventory: result.inventoryCount,
        purchaseOrders: result.purchaseOrdersCount,
        transactions: result.transactionsCount,
      },
      missingLeadTimeCount,
      missingCapacityCount,
    };
  } catch (err: unknown) {
    console.error("[commitSmartImport] Failed transaction:", err);
    return {
      success: false,
      importedCounts: {
        warehouses: 0,
        suppliers: 0,
        products: 0,
        inventory: 0,
        purchaseOrders: 0,
        transactions: 0,
      },
      missingLeadTimeCount: 0,
      missingCapacityCount: 0,
      error: err instanceof Error ? err.message : "Database transaction failed",
    };
  }
}

/**
 * Saves learned column mappings into PostgreSQL keyed to orgId + signature (I2).
 */
export async function saveOrgImportMapping(
  orgId: string,
  headersSignature: string,
  mappings: SheetMapping[]
): Promise<void> {
  try {
    const mappingJson = JSON.stringify(mappings);
    await prisma.importMapping.upsert({
      where: {
        orgId_headersSignature: {
          orgId,
          headersSignature,
        },
      },
      create: {
        orgId,
        headersSignature,
        mappingJson,
      },
      update: {
        mappingJson,
      },
    });
  } catch (err) {
    console.warn("[saveOrgImportMapping] Could not save mapping:", err);
  }
}

/**
 * Retrieves learned column mappings from PostgreSQL (I2).
 */
export async function getOrgImportMapping(
  orgId: string,
  headersSignature: string
): Promise<SheetMapping[] | null> {
  try {
    const row = await prisma.importMapping.findUnique({
      where: {
        orgId_headersSignature: {
          orgId,
          headersSignature,
        },
      },
    });
    if (!row) return null;
    return JSON.parse(row.mappingJson) as SheetMapping[];
  } catch (err) {
    console.warn("[getOrgImportMapping] Could not retrieve mapping:", err);
    return null;
  }
}
