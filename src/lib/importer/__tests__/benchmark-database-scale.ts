import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { commitSmartImport } from "@/data/repositories/smart-import";
import type { ImportCommitPayload } from "@/lib/importer/types";

async function runScaleBenchmark() {
  console.log("================================================================================");
  console.log("TRUE POSTGRESQL DATABASE SCALE BENCHMARK (A1)");
  console.log("Measuring wall-clock time from prisma.$transaction start to commit on real PostgreSQL");
  console.log("================================================================================");

  const testOrgId = "org_benchmark_scale_test";
  const counts = [1000, 10000, 50000];

  const results: {
    rowCount: number;
    inMemoryMs: number;
    run1InsertMs: number;
    run2UpdateMs: number;
  }[] = [];

  for (const count of counts) {
    console.log(`\n--- Testing ${count.toLocaleString()} rows scale ---`);

    // Phase 1: In-memory dataset synthesis & preparation
    const memStart = Date.now();
    const warehouseCount = Math.min(5, Math.ceil(count / 2000));
    const supplierCount = Math.min(10, Math.ceil(count / 1000));
    const productCount = Math.min(100, Math.ceil(count / 100));

    const warehouses = Array.from({ length: warehouseCount }, (_, i) => ({
      code: `WH-SCALE-${i + 1}`,
      name: `Benchmark Warehouse ${i + 1}`,
      capacityUnits: 100000,
    }));

    const suppliers = Array.from({ length: supplierCount }, (_, i) => ({
      supplierId: `SUP-SCALE-${i + 1}`,
      name: `Benchmark Supplier ${i + 1}`,
      leadTimeDays: 14,
      email: `supplier${i + 1}@benchmark.internal`,
    }));

    const products = Array.from({ length: productCount }, (_, i) => ({
      sku: `SKU-SCALE-${i + 1}`,
      name: `Benchmark Product ${i + 1}`,
      category: "Industrial",
      unitCost: 25.5,
      supplierId: suppliers[i % supplierCount].supplierId,
    }));

    const inventory = [];
    for (const p of products) {
      for (const w of warehouses) {
        inventory.push({
          sku: p.sku,
          warehouseCode: w.code,
          quantityOnHand: 1500,
        });
      }
    }

    const purchaseOrders = Array.from({ length: Math.min(50, Math.ceil(count / 200)) }, (_, i) => ({
      poNumber: `PO-SCALE-${i + 1}`,
      supplierId: suppliers[i % supplierCount].supplierId,
      sku: products[i % productCount].sku,
      quantity: 500,
      unitPrice: 25.5,
      orderDate: "2026-08-01",
      expectedDate: "2026-08-15",
      receivedDate: i % 2 === 0 ? "2026-08-14" : null,
    }));

    const transactions = [];
    const baseDate = new Date("2026-06-01");
    for (let i = 0; i < count; i++) {
      const p = products[i % productCount];
      const w = warehouses[i % warehouseCount];
      const txDate = new Date(baseDate.getTime() + (i % 90) * 86400 * 1000);
      transactions.push({
        sku: p.sku,
        warehouseCode: w.code,
        quantity: (i % 25) + 1,
        direction: i % 2 === 0 ? ("IN" as const) : ("OUT" as const),
        date: txDate.toISOString().slice(0, 10),
      });
    }

    const payload: ImportCommitPayload = {
      warehouses,
      suppliers,
      products,
      inventory,
      purchaseOrders,
      transactions,
      skuDuplicateResolution: "sum",
      clearExisting: true,
    };

    const inMemoryMs = Date.now() - memStart;
    console.log(`[Phase A] In-Memory Prep Time: ${inMemoryMs} ms`);

    // Phase 2: Run 1 (Fresh Inserts inside single prisma.$transaction)
    const run1Start = Date.now();
    const res1 = await commitSmartImport(testOrgId, payload);
    const run1InsertMs = Date.now() - run1Start;

    if (!res1.success) {
      throw new Error(`Run 1 failed: ${res1.error}`);
    }
    console.log(`[Phase B] Run 1 (Fresh Inserts Transaction Time): ${run1InsertMs} ms`);

    // Phase 3: Run 2 (All-Updates / Upserts on existing composite keys)
    // Run without clearExisting to execute full upsert UPDATE branch
    const payloadUpdate: ImportCommitPayload = {
      ...payload,
      clearExisting: false,
      transactions: [], // Test entity upserts on existing keys
    };
    const run2Start = Date.now();
    const res2 = await commitSmartImport(testOrgId, payloadUpdate);
    const run2UpdateMs = Date.now() - run2Start;

    if (!res2.success) {
      throw new Error(`Run 2 failed: ${res2.error}`);
    }
    console.log(`[Phase C] Run 2 (Entity Upsert Update Time): ${run2UpdateMs} ms`);

    results.push({
      rowCount: count,
      inMemoryMs,
      run1InsertMs,
      run2UpdateMs,
    });
  }

  // Cleanup benchmark test org data
  await prisma.transaction.deleteMany({ where: { orgId: testOrgId } });
  await prisma.purchaseOrder.deleteMany({ where: { orgId: testOrgId } });
  await prisma.inventory.deleteMany({ where: { orgId: testOrgId } });
  await prisma.product.deleteMany({ where: { orgId: testOrgId } });
  await prisma.supplier.deleteMany({ where: { orgId: testOrgId } });
  await prisma.warehouse.deleteMany({ where: { orgId: testOrgId } });

  console.log("\n================================================================================");
  console.log("FINAL PHASE-SEPARATED SCALE BENCHMARK REPORT");
  console.log("================================================================================");
  console.log("Volume       | In-Memory Phase | Run 1: Inserts ($tx) | Run 2: Updates ($tx)");
  console.log("-------------+-----------------+----------------------+---------------------");
  for (const r of results) {
    const vol = `${r.rowCount.toLocaleString()} rows`.padEnd(12);
    const mem = `${r.inMemoryMs} ms`.padEnd(15);
    const ins = `${r.run1InsertMs} ms`.padEnd(20);
    const upd = `${r.run2UpdateMs} ms`.padEnd(19);
    console.log(`${vol} | ${mem} | ${ins} | ${upd}`);
  }
  console.log("================================================================================");
}

runScaleBenchmark()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Benchmark failed:", err);
    process.exit(1);
  });
