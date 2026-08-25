/**
 * Re-runnable demo seed for a realistic-but-imperfect distributor.
 * Wipes all tables, then repopulates: 3 warehouses, ~120 SKUs, 8 suppliers,
 * ~200 purchase orders, 90 days of transaction history. See docs/metrics.md
 * for the guaranteed imperfections this script targets.
 *
 * Everything is computed in plain JS objects first and written with a
 * handful of bulk `createMany` calls — not one round trip per row — since
 * the local dev Postgres proxy is noticeably less stable under hundreds of
 * sequential individual queries.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL, max: 5 });
const basePrisma = new PrismaClient({ adapter });

/** The local `prisma dev` proxy intermittently drops a connection mid-query — retry transparently. */
const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ query, args }) {
      const maxAttempts = 5;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await query(args);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const isTransient = message.includes("Connection terminated") || message.includes("ConnectionClosed") || message.includes("P1017");
          if (!isTransient || attempt === maxAttempts) throw error;
          console.log(`  (connection hiccup, retrying — attempt ${attempt}/${maxAttempts})`);
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
        }
      }
      throw new Error("unreachable");
    },
  },
});

// ---- tiny seeded RNG (mulberry32) so a bad seed can be reproduced while debugging ----
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260825);
const randFloat = (min: number, max: number, decimals = 2) => {
  const v = min + rng() * (max - min);
  const p = 10 ** decimals;
  return Math.round(v * p) / p;
};
const randInt = (min: number, max: number) => Math.floor(randFloat(min, max + 1, 0));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const chance = (p: number) => rng() < p;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function addDaysDate(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function clampToToday(d: Date): Date {
  const today = daysAgo(0);
  return d > today ? today : d;
}

const CATEGORIES = ["raw_material", "component", "finished_good", "packaging", "mro"];
const PRODUCT_ADJECTIVES = ["Standard", "Heavy-Duty", "Compact", "Industrial", "Precision", "Universal", "Reinforced"];
const PRODUCT_NOUNS = ["Bracket", "Actuator Arm", "Housing", "Connector", "Panel", "Valve", "Bearing", "Gasket", "Sensor", "Cable Assembly"];
const SUPPLIER_NAMES = [
  "Delta Components",
  "Northgate Materials",
  "Silverline Industrial",
  "Pacific Rim Fabrication",
  "Vantage Metals Co.",
  "Cascade Supply Group",
  "Ironbridge Manufacturing",
  "Solstice Packaging",
];

const HISTORY_DAYS = 90; // matches the trailing-window the metrics layer reads
const PO_HISTORY_DAYS = 110; // a bit wider so cycle-time/OTIF has POs that started before the 90-day window

async function main() {
  console.log("Wiping existing data...");
  await prisma.transaction.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();

  // ---- 1. Warehouses (capacity fixed up after we know total on-hand, below) ----
  const warehouseDefs = [
    { code: "WH-EAST", name: "East Coast DC" },
    { code: "WH-WEST", name: "West Coast DC" },
    { code: "WH-CENTRAL", name: "Central Fulfillment" },
  ];
  await prisma.warehouse.createMany({ data: warehouseDefs.map((w) => ({ ...w, capacityUnits: 1 })) });
  const warehouses = await prisma.warehouse.findMany();

  // ---- 2. Suppliers (8) — supplier index 3 ("Pacific Rim Fabrication") is the deliberate ~70% OTIF problem supplier ----
  const PROBLEM_SUPPLIER_INDEX = 3;
  const supplierReliability = new Map<string, number>();
  const supplierDefs = SUPPLIER_NAMES.map((name, i) => {
    const supplierId = `SUP-${String(i + 1).padStart(3, "0")}`;
    const reliability = i === PROBLEM_SUPPLIER_INDEX ? 0.7 : randFloat(0.62, 0.78, 2);
    supplierReliability.set(supplierId, reliability);
    return {
      supplierId,
      name,
      leadTimeDays: randInt(5, 30),
      email: `orders@${name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
    };
  });
  await prisma.supplier.createMany({ data: supplierDefs });

  // ---- 3. Products (~120 SKUs), assigned to a supplier and to exactly one warehouse each ----
  const PRODUCT_COUNT = 120;
  const skuCounters: Record<string, number> = {};
  const products: { sku: string; supplierId: string; leadTimeDays: number; unitCost: number; warehouse: (typeof warehouses)[number] }[] = [];
  const productDefs = [];
  for (let i = 0; i < PRODUCT_COUNT; i++) {
    const category = pick(CATEGORIES);
    const catCode = category.slice(0, 2).toUpperCase();
    skuCounters[category] = (skuCounters[category] ?? 0) + 1;
    const sku = `${catCode}-${String(skuCounters[category]).padStart(4, "0")}`;
    const supplierDef = pick(supplierDefs);
    const unitCost = randFloat(2, 120, 2);
    productDefs.push({
      sku,
      name: `${pick(PRODUCT_ADJECTIVES)} ${pick(PRODUCT_NOUNS)}`,
      category,
      unitCost,
      supplierId: supplierDef.supplierId,
    });
    products.push({ sku, supplierId: supplierDef.supplierId, leadTimeDays: supplierDef.leadTimeDays, unitCost, warehouse: pick(warehouses) });
  }
  await prisma.product.createMany({ data: productDefs });

  // ---- 4. Inventory + 90 days of transactions, with guaranteed status buckets ----
  // "Several" understock/overstock pairs; the rest land healthy by construction.
  const UNDERSTOCK_COUNT = 20;
  const OVERSTOCK_COUNT = 20;
  const bucketBySku = new Map<string, "understock" | "overstock" | "healthy">();
  const shuffled = [...products].sort(() => rng() - 0.5);
  shuffled.slice(0, UNDERSTOCK_COUNT).forEach((p) => bucketBySku.set(p.sku, "understock"));
  shuffled.slice(UNDERSTOCK_COUNT, UNDERSTOCK_COUNT + OVERSTOCK_COUNT).forEach((p) => bucketBySku.set(p.sku, "overstock"));

  const txnBatch: { sku: string; warehouseId: number; quantity: number; direction: "IN" | "OUT"; date: Date }[] = [];
  const inventoryBatch: { sku: string; warehouseId: number; quantityOnHand: number }[] = [];
  const warehouseOnHand = new Map<number, number>();

  for (const p of products) {
    const bucket = bucketBySku.get(p.sku) ?? "healthy";

    // Target daily demand: a mostly-active catalog, a handful of slow movers.
    const velocity = chance(0.12) ? "dead" : chance(0.35) ? "slow" : chance(0.6) ? "medium" : "fast";
    const targetDailyDemand =
      velocity === "dead" ? 0 : velocity === "slow" ? randFloat(0.05, 0.6, 2) : velocity === "medium" ? randFloat(0.6, 3, 2) : randFloat(3, 9, 2);

    // Spread that demand across a realistic number of outbound transactions over the trailing 90 days.
    const totalDemand = Math.round(targetDailyDemand * HISTORY_DAYS);
    if (totalDemand > 0) {
      const txnCount = Math.max(3, Math.min(40, Math.round(totalDemand / randInt(3, 12))));
      let remaining = totalDemand;
      for (let t = 0; t < txnCount; t++) {
        const isLast = t === txnCount - 1;
        const qty = isLast ? remaining : Math.max(1, Math.round(remaining / (txnCount - t)) + randInt(-2, 2));
        const bounded = Math.max(1, Math.min(remaining, qty));
        remaining -= bounded;
        txnBatch.push({ sku: p.sku, warehouseId: p.warehouse.id, quantity: bounded, direction: "OUT", date: daysAgo(randInt(0, HISTORY_DAYS - 1)) });
        if (remaining <= 0) break;
      }
    }
    const avgDailyDemand = totalDemand > 0 ? totalDemand / HISTORY_DAYS : null;

    // A handful of plausible inbound receipts too (for the movement trend/activity feed — not reconciled against on-hand).
    if (chance(0.7)) {
      const inboundEvents = randInt(1, 3);
      for (let e = 0; e < inboundEvents; e++) {
        txnBatch.push({ sku: p.sku, warehouseId: p.warehouse.id, quantity: randInt(20, 300), direction: "IN", date: daysAgo(randInt(0, HISTORY_DAYS - 1)) });
      }
    }

    // Reorder math, using the same formulas as src/lib/metrics/inventory.ts, to place on-hand precisely.
    const safetyStock = (avgDailyDemand ?? 0) * (p.leadTimeDays * 0.5);
    const overstockThreshold = safetyStock + (avgDailyDemand ?? 0) * 30;

    let quantityOnHand: number;
    if (bucket === "understock") {
      quantityOnHand = Math.max(0, Math.round(safetyStock * randFloat(0.1, 0.7, 2)));
    } else if (bucket === "overstock") {
      quantityOnHand = Math.round(Math.max(overstockThreshold * 1.3, overstockThreshold + 50) * randFloat(1, 1.4, 2));
    } else if (velocity === "dead") {
      quantityOnHand = randInt(5, 80); // dead stock: some stock sitting with no recent demand
    } else {
      const lo = safetyStock * 1.1;
      const hi = Math.max(lo + 10, overstockThreshold * 0.85);
      quantityOnHand = Math.round(randFloat(lo, hi, 2));
    }

    inventoryBatch.push({ sku: p.sku, warehouseId: p.warehouse.id, quantityOnHand });
    warehouseOnHand.set(p.warehouse.id, (warehouseOnHand.get(p.warehouse.id) ?? 0) + quantityOnHand);
  }

  await prisma.inventory.createMany({ data: inventoryBatch });
  await prisma.transaction.createMany({ data: txnBatch });

  // ---- 5. Fix up warehouse capacities: one deliberately near/over capacity, the other two comfortably healthy ----
  const nearCapacityWarehouse = pick(warehouses);
  for (const w of warehouses) {
    const onHand = warehouseOnHand.get(w.id) ?? 0;
    const utilization = w.id === nearCapacityWarehouse.id ? randFloat(0.92, 0.98, 2) : randFloat(0.55, 0.75, 2);
    const capacityUnits = Math.max(100, Math.round(onHand / utilization));
    await prisma.warehouse.update({ where: { id: w.id }, data: { capacityUnits } });
  }

  // ---- 6. Purchase orders (~200), reliability-driven per supplier, at least 2 forced late ----
  const PO_COUNT = 200;
  const poDefs: { poNumber: string; supplierId: string; sku: string; quantity: number; unitPrice: number; orderDate: Date; expectedDate: Date; receivedDate: Date | null }[] = [];
  let poCounter = 0;
  for (let i = 0; i < PO_COUNT; i++) {
    const supplierDef = pick(supplierDefs);
    const supplierProducts = products.filter((p) => p.supplierId === supplierDef.supplierId);
    if (supplierProducts.length === 0) continue;
    const product = pick(supplierProducts);
    const reliability = supplierReliability.get(supplierDef.supplierId) ?? 0.85;

    poCounter++;
    const orderDate = daysAgo(randInt(0, PO_HISTORY_DAYS));
    const expectedDate = addDaysDate(orderDate, supplierDef.leadTimeDays);
    const isDue = expectedDate <= daysAgo(0);

    let receivedDate: Date | null = null;
    if (isDue) {
      receivedDate = chance(reliability)
        ? clampToToday(addDaysDate(expectedDate, -randInt(0, 2)))
        : clampToToday(addDaysDate(expectedDate, randInt(1, 12)));
    }

    poDefs.push({
      poNumber: `PO-${1000 + poCounter}`,
      supplierId: supplierDef.supplierId,
      sku: product.sku,
      quantity: randInt(50, 500),
      unitPrice: Math.round(product.unitCost * randFloat(0.8, 1.3, 4) * 100) / 100,
      orderDate,
      expectedDate,
      receivedDate,
    });
  }

  // Guarantee at least two unmistakably late purchase orders, regardless of how the dice landed above.
  const receivedIndices = poDefs.map((po, i) => (po.receivedDate ? i : -1)).filter((i) => i >= 0);
  for (const i of receivedIndices.slice(0, 2)) {
    poDefs[i].receivedDate = clampToToday(addDaysDate(poDefs[i].expectedDate, randInt(5, 10)));
  }

  await prisma.purchaseOrder.createMany({ data: poDefs });

  console.log("\nSeed complete.");
  console.log(`  Warehouses: ${warehouses.length}, Suppliers: ${supplierDefs.length}, Products: ${products.length}, Purchase orders: ${poDefs.length}`);
  console.log("Run `npx tsx prisma/health-check.ts` to see the resulting health score breakdown.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
