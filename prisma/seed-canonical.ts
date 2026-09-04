/**
 * Canonical seed script for Supply Chain Manager.
 * Populates the verified canonical dataset:
 * - 4 Warehouses: NDC (50,000), WH-WEST (25,000), WH-EAST (30,000), WH-SOUTH (15,000)
 * - 6 Suppliers: SUP-001 to SUP-006 (SUP-004 at 0% OTIF with 2 open overdue POs)
 * - 24 Products: SKU-1001 to SKU-1024
 * - 49 Inventory positions (12 overstock positions, SKU-1015 at NDC with ~3.2 days cover)
 * - 64 Purchase Orders (exactly 2 overdue POs)
 * - ~3,900 Transactions over trailing 90 days
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString, max: 5 });
const basePrisma = new PrismaClient({ adapter });

const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ query, args }) {
      const maxAttempts = 8;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await query(args);
        } catch (error) {
          const err = error as { message?: string; code?: string; meta?: { driverAdapterError?: unknown } };
          const msg = `${err?.message || ""} ${err?.code || ""} ${String(err?.meta?.driverAdapterError || "")} ${String(error)}`;
          const isTransient =
            msg.includes("Connection terminated") ||
            msg.includes("ConnectionClosed") ||
            msg.includes("P1017") ||
            msg.includes("Server has closed the connection") ||
            msg.includes("ECONNRESET") ||
            msg.includes("closed the connection") ||
            err?.code === "P1017" ||
            err?.code === "P2010";

          if (!isTransient || attempt === maxAttempts) throw error;
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
        }
      }
      throw new Error("unreachable");
    },
  },
}) as unknown as PrismaClient;

function parseOrgId(): string {
  const flagIndex = process.argv.indexOf("--org");
  return flagIndex !== -1 && process.argv[flagIndex + 1] ? process.argv[flagIndex + 1] : "org_demo";
}

const ORG_ID = parseOrgId();

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

export async function seedCanonicalData(targetOrg: string = ORG_ID) {
  console.log(`\n--- Seeding Canonical Dataset for Org: [${targetOrg}] ---`);

  // 0. Clean existing data for this org
  await prisma.transaction.deleteMany({ where: { orgId: targetOrg } });
  await prisma.purchaseOrder.deleteMany({ where: { orgId: targetOrg } });
  await prisma.inventory.deleteMany({ where: { orgId: targetOrg } });
  await prisma.product.deleteMany({ where: { orgId: targetOrg } });
  await prisma.supplier.deleteMany({ where: { orgId: targetOrg } });
  await prisma.warehouse.deleteMany({ where: { orgId: targetOrg } });
  await prisma.importMapping.deleteMany({ where: { orgId: targetOrg } });

  // 1. Warehouses (4) - Real canonical definitions
  const warehouseDefs = [
    { code: "NDC", name: "National Distribution Center", capacityUnits: 50000 },
    { code: "WH-WEST", name: "West Coast DC", capacityUnits: 25000 },
    { code: "WH-EAST", name: "East Coast DC", capacityUnits: 30000 },
    { code: "WH-SOUTH", name: "Southern Regional Hub", capacityUnits: 15000 },
  ];

  await prisma.warehouse.createMany({
    data: warehouseDefs.map((w) => ({ ...w, orgId: targetOrg })),
  });
  const warehouses = await prisma.warehouse.findMany({
    where: { orgId: targetOrg },
    orderBy: { code: "asc" },
  });
  const whMap = new Map(warehouses.map((w) => [w.code, w.id]));
  const ndcId = whMap.get("NDC")!;
  const westId = whMap.get("WH-WEST")!;
  const eastId = whMap.get("WH-EAST")!;
  const southId = whMap.get("WH-SOUTH")!;

  // 2. Suppliers (6)
  const supplierDefs = [
    { supplierId: "SUP-001", name: "Delta Components", leadTimeDays: 7, email: "orders@deltacomponents.com" },
    { supplierId: "SUP-002", name: "Northgate Materials", leadTimeDays: 14, email: "sales@northgatematerials.com" },
    { supplierId: "SUP-003", name: "Silverline Industrial", leadTimeDays: 10, email: "dispatch@silverlineindustrial.com" },
    { supplierId: "SUP-004", name: "Orion Electronics", leadTimeDays: 12, email: "orders@orionelectronics.com" },
    { supplierId: "SUP-005", name: "Vantage Metals Co.", leadTimeDays: 21, email: "fulfillment@vantagemetals.com" },
    { supplierId: "SUP-006", name: "Cascade Supply Group", leadTimeDays: 5, email: "sales@cascadesupply.com" },
  ];

  await prisma.supplier.createMany({
    data: supplierDefs.map((s) => ({ ...s, orgId: targetOrg })),
  });

  // 3. Products (24)
  const productDefs = [
    // SUP-001 (Delta Components, 7d)
    { sku: "SKU-1001", name: "Precision Ball Bearing 6204", category: "component", unitCost: 12.50, supplierId: "SUP-001" },
    { sku: "SKU-1002", name: "Neoprene Gasket Ring M10", category: "packaging", unitCost: 4.20, supplierId: "SUP-001" },
    { sku: "SKU-1003", name: "Hydraulic Check Valve 1/2in", category: "finished_good", unitCost: 28.00, supplierId: "SUP-001" },
    { sku: "SKU-1004", name: "Stainless Steel Hex Bolt M8", category: "component", unitCost: 1.75, supplierId: "SUP-001" },

    // SUP-002 (Northgate Materials, 14d)
    { sku: "SKU-1005", name: "Aluminum Extrusion Profile 40x40", category: "raw_material", unitCost: 45.00, supplierId: "SUP-002" },
    { sku: "SKU-1006", name: "High-Tension Steel Spring", category: "component", unitCost: 8.50, supplierId: "SUP-002" },
    { sku: "SKU-1007", name: "Polyurethane Drive Belt B52", category: "component", unitCost: 32.00, supplierId: "SUP-002" },
    { sku: "SKU-1008", name: "Titanium Fastener Assortment", category: "mro", unitCost: 64.00, supplierId: "SUP-002" },

    // SUP-003 (Silverline Industrial, 10d)
    { sku: "SKU-1009", name: "Pneumatic Air Cylinder 50mm", category: "finished_good", unitCost: 19.50, supplierId: "SUP-003" },
    { sku: "SKU-1010", name: "Industrial Servo Motor 750W", category: "finished_good", unitCost: 52.00, supplierId: "SUP-003" },
    { sku: "SKU-1011", name: "Nitrile O-Ring Pack 100pc", category: "packaging", unitCost: 11.00, supplierId: "SUP-003" },
    { sku: "SKU-1012", name: "Flange Mounting Bracket 90Deg", category: "component", unitCost: 23.50, supplierId: "SUP-003" },

    // SUP-004 (Orion Electronics, 12d) - Problem Supplier
    { sku: "SKU-1013", name: "Optoelectronic Sensor Module", category: "component", unitCost: 75.00, supplierId: "SUP-004" },
    { sku: "SKU-1014", name: "Thermal Relay Controller", category: "finished_good", unitCost: 38.00, supplierId: "SUP-004" },
    { sku: "SKU-1015", name: "Digital Pressure Transducer 10Bar", category: "finished_good", unitCost: 8.20, supplierId: "SUP-004" },
    { sku: "SKU-1016", name: "Linear Optical Encoder 500mm", category: "component", unitCost: 44.00, supplierId: "SUP-004" },

    // SUP-005 (Vantage Metals Co., 21d)
    { sku: "SKU-1017", name: "Cast Iron Pillow Block Housing", category: "raw_material", unitCost: 85.00, supplierId: "SUP-005" },
    { sku: "SKU-1018", name: "Hardened Steel Shaft 25mm x 1m", category: "raw_material", unitCost: 62.00, supplierId: "SUP-005" },
    { sku: "SKU-1019", name: "Zinc Plated Coupler Sleeve", category: "component", unitCost: 18.00, supplierId: "SUP-005" },
    { sku: "SKU-1020", name: "Bronze Bushing Sleeve 20mm", category: "component", unitCost: 29.50, supplierId: "SUP-005" },

    // SUP-006 (Cascade Supply Group, 5d)
    { sku: "SKU-1021", name: "Industrial Corrugated Carton XL", category: "packaging", unitCost: 3.50, supplierId: "SUP-006" },
    { sku: "SKU-1022", name: "Heavy Duty Strapping Tape 50mm", category: "packaging", unitCost: 7.80, supplierId: "SUP-006" },
    { sku: "SKU-1023", name: "Anti-Static Bubble Wrap Roll", category: "packaging", unitCost: 14.20, supplierId: "SUP-006" },
    { sku: "SKU-1024", name: "Heat Shrink Tubing Assortment", category: "mro", unitCost: 2.50, supplierId: "SUP-006" },
  ];

  await prisma.product.createMany({
    data: productDefs.map((p) => ({ ...p, orgId: targetOrg })),
  });

  // 4. Inventory Positions (49) & Transactions (~3,900)
  // We specify exactly 49 positions across the 4 warehouses:
  // 12 Overstock positions, SKU-1015 at NDC with ~3.2 days cover, and healthy/low stock items.

  interface PositionSpec {
    sku: string;
    whCode: string;
    warehouseId: number;
    qoh: number;
    dailyDemand: number;
    isOverstock?: boolean;
    isSku1015Ndc?: boolean;
  }

  const positions: PositionSpec[] = [
    // NDC (18 positions) - 7 Overstocks (items 1, 2, 3, 5, 8, 10, 17)
    { sku: "SKU-1001", whCode: "NDC", warehouseId: ndcId, qoh: 1000, dailyDemand: 15, isOverstock: true }, // ot ~ 378.6, dos = 66.7 -> OVERSTOCK (1)
    { sku: "SKU-1002", whCode: "NDC", warehouseId: ndcId, qoh: 1400, dailyDemand: 20, isOverstock: true }, // ot ~ 498.6, dos = 70.0 -> OVERSTOCK (2)
    { sku: "SKU-1003", whCode: "NDC", warehouseId: ndcId, qoh: 600, dailyDemand: 8, isOverstock: true }, // ot ~ 210.6, dos = 75.0 -> OVERSTOCK (3)
    { sku: "SKU-1004", whCode: "NDC", warehouseId: ndcId, qoh: 240, dailyDemand: 12 }, // ot ~ 306.6 -> healthy
    { sku: "SKU-1005", whCode: "NDC", warehouseId: ndcId, qoh: 500, dailyDemand: 6, isOverstock: true }, // ot ~ 296.3, dos = 83.3 -> OVERSTOCK (4)
    { sku: "SKU-1006", whCode: "NDC", warehouseId: ndcId, qoh: 380, dailyDemand: 14 }, // ot ~ 656.3 -> healthy
    { sku: "SKU-1007", whCode: "NDC", warehouseId: ndcId, qoh: 320, dailyDemand: 10 }, // ot ~ 476.3 -> healthy
    { sku: "SKU-1008", whCode: "NDC", warehouseId: ndcId, qoh: 450, dailyDemand: 5, isOverstock: true }, // ot ~ 251.3, dos = 90.0 -> OVERSTOCK (5)
    { sku: "SKU-1009", whCode: "NDC", warehouseId: ndcId, qoh: 280, dailyDemand: 12 }, // ot ~ 418.3 -> healthy
    { sku: "SKU-1010", whCode: "NDC", warehouseId: ndcId, qoh: 350, dailyDemand: 4, isOverstock: true }, // ot ~ 154.3, dos = 87.5 -> OVERSTOCK (6)
    { sku: "SKU-1011", whCode: "NDC", warehouseId: ndcId, qoh: 350, dailyDemand: 18 }, // ot ~ 616.3 -> healthy
    { sku: "SKU-1012", whCode: "NDC", warehouseId: ndcId, qoh: 200, dailyDemand: 8 }, // ot ~ 286.3 -> healthy
    { sku: "SKU-1013", whCode: "NDC", warehouseId: ndcId, qoh: 180, dailyDemand: 6 }, // ot ~ 258.4 -> healthy
    { sku: "SKU-1014", whCode: "NDC", warehouseId: ndcId, qoh: 160, dailyDemand: 5 }, // ot ~ 219.4 -> healthy
    // SKU-1015 at NDC: Target ~3.2 days of cover! qoh = 32, daily demand = 10 -> daysOfStock = 3.2
    { sku: "SKU-1015", whCode: "NDC", warehouseId: ndcId, qoh: 32, dailyDemand: 10, isSku1015Ndc: true },
    { sku: "SKU-1016", whCode: "NDC", warehouseId: ndcId, qoh: 220, dailyDemand: 8 }, // ot ~ 336.4 -> healthy
    { sku: "SKU-1017", whCode: "NDC", warehouseId: ndcId, qoh: 300, dailyDemand: 3, isOverstock: true }, // ot ~ 230.3, dos = 100.0 -> OVERSTOCK (7)
    { sku: "SKU-1018", whCode: "NDC", warehouseId: ndcId, qoh: 280, dailyDemand: 7 }, // ot ~ 494.3 -> healthy

    // WH-WEST (11 positions) - 2 Overstocks (items 21, 24)
    { sku: "SKU-1001", whCode: "WH-WEST", warehouseId: westId, qoh: 180, dailyDemand: 10 }, // ot ~ 258.6 -> healthy
    { sku: "SKU-1002", whCode: "WH-WEST", warehouseId: westId, qoh: 200, dailyDemand: 12 }, // ot ~ 306.6 -> healthy
    { sku: "SKU-1004", whCode: "WH-WEST", warehouseId: westId, qoh: 650, dailyDemand: 8, isOverstock: true }, // ot ~ 210.6, dos = 81.3 -> OVERSTOCK (8)
    { sku: "SKU-1006", whCode: "WH-WEST", warehouseId: westId, qoh: 240, dailyDemand: 9 }, // ot ~ 431.3 -> healthy
    { sku: "SKU-1009", whCode: "WH-WEST", warehouseId: westId, qoh: 180, dailyDemand: 7 }, // ot ~ 253.3 -> healthy
    { sku: "SKU-1011", whCode: "WH-WEST", warehouseId: westId, qoh: 550, dailyDemand: 6, isOverstock: true }, // ot ~ 220.3, dos = 91.7 -> OVERSTOCK (9)
    { sku: "SKU-1013", whCode: "WH-WEST", warehouseId: westId, qoh: 140, dailyDemand: 4 }, // ot ~ 180.4 -> healthy
    { sku: "SKU-1015", whCode: "WH-WEST", warehouseId: westId, qoh: 190, dailyDemand: 8 }, // ot ~ 336.4 -> healthy
    { sku: "SKU-1019", whCode: "WH-WEST", warehouseId: westId, qoh: 160, dailyDemand: 5 }, // ot ~ 362.3 -> healthy
    { sku: "SKU-1021", whCode: "WH-WEST", warehouseId: westId, qoh: 180, dailyDemand: 15 }, // ot ~ 285.8 -> healthy
    { sku: "SKU-1023", whCode: "WH-WEST", warehouseId: westId, qoh: 80, dailyDemand: 7 }, // ot ~ 141.8 -> healthy

    // WH-EAST (11 positions) - 2 Overstocks (items 32, 37)
    { sku: "SKU-1003", whCode: "WH-EAST", warehouseId: eastId, qoh: 160, dailyDemand: 9 }, // ot ~ 234.6 -> healthy
    { sku: "SKU-1005", whCode: "WH-EAST", warehouseId: eastId, qoh: 180, dailyDemand: 6 }, // ot ~ 296.3 -> healthy
    { sku: "SKU-1007", whCode: "WH-EAST", warehouseId: eastId, qoh: 600, dailyDemand: 7, isOverstock: true }, // ot ~ 341.3, dos = 85.7 -> OVERSTOCK (10)
    { sku: "SKU-1008", whCode: "WH-EAST", warehouseId: eastId, qoh: 210, dailyDemand: 8 }, // ot ~ 386.3 -> healthy
    { sku: "SKU-1010", whCode: "WH-EAST", warehouseId: eastId, qoh: 140, dailyDemand: 5 }, // ot ~ 187.3 -> healthy
    { sku: "SKU-1012", whCode: "WH-EAST", warehouseId: eastId, qoh: 170, dailyDemand: 7 }, // ot ~ 253.3 -> healthy
    { sku: "SKU-1014", whCode: "WH-EAST", warehouseId: eastId, qoh: 130, dailyDemand: 4 }, // ot ~ 180.4 -> healthy
    { sku: "SKU-1016", whCode: "WH-EAST", warehouseId: eastId, qoh: 500, dailyDemand: 5, isOverstock: true }, // ot ~ 219.4, dos = 100.0 -> OVERSTOCK (11)
    { sku: "SKU-1018", whCode: "WH-EAST", warehouseId: eastId, qoh: 210, dailyDemand: 6 }, // ot ~ 428.3 -> healthy
    { sku: "SKU-1020", whCode: "WH-EAST", warehouseId: eastId, qoh: 150, dailyDemand: 4 }, // ot ~ 296.3 -> healthy
    { sku: "SKU-1022", whCode: "WH-EAST", warehouseId: eastId, qoh: 130, dailyDemand: 10 }, // ot ~ 195.8 -> healthy

    // WH-SOUTH (9 positions) - 1 Overstock (item 47) - Total Overstock = 7 + 2 + 2 + 1 = 12 Overstocks!
    { sku: "SKU-1002", whCode: "WH-SOUTH", warehouseId: southId, qoh: 150, dailyDemand: 7 }, // ot ~ 288.3 -> healthy
    { sku: "SKU-1006", whCode: "WH-SOUTH", warehouseId: southId, qoh: 140, dailyDemand: 5 }, // ot ~ 342.3 -> healthy
    { sku: "SKU-1011", whCode: "WH-SOUTH", warehouseId: southId, qoh: 180, dailyDemand: 8 }, // ot ~ 426.4 -> healthy
    { sku: "SKU-1015", whCode: "WH-SOUTH", warehouseId: southId, qoh: 120, dailyDemand: 4 }, // ot ~ 243.2 -> healthy
    { sku: "SKU-1017", whCode: "WH-SOUTH", warehouseId: southId, qoh: 140, dailyDemand: 4 }, // ot ~ 375.2 -> healthy
    { sku: "SKU-1019", whCode: "WH-SOUTH", warehouseId: southId, qoh: 150, dailyDemand: 5 }, // ot ~ 469.9 -> healthy
    { sku: "SKU-1021", whCode: "WH-SOUTH", warehouseId: southId, qoh: 600, dailyDemand: 8, isOverstock: true }, // ot ~ 261.5, dos = 79.9 -> OVERSTOCK (12)
    { sku: "SKU-1022", whCode: "WH-SOUTH", warehouseId: southId, qoh: 100, dailyDemand: 7 }, // ot ~ 228.6 -> healthy
    { sku: "SKU-1024", whCode: "WH-SOUTH", warehouseId: southId, qoh: 110, dailyDemand: 9 }, // ot ~ 294.2 -> healthy
  ];

  console.log(`Generated ${positions.length} inventory positions across 4 warehouses.`);

  // Write inventory positions
  await prisma.inventory.createMany({
    data: positions.map((p) => ({
      orgId: targetOrg,
      sku: p.sku,
      warehouseId: p.warehouseId,
      quantityOnHand: p.qoh,
    })),
  });

  // Generate Transactions (~3,900 rows)
  const txnData: {
    orgId: string;
    sku: string;
    warehouseId: number;
    quantity: number;
    direction: "IN" | "OUT";
    date: Date;
  }[] = [];

  const HISTORY_DAYS = 90;

  positions.forEach((pos, posIdx) => {
    const dailyBase = pos.dailyDemand;
    // 40 positions have daily outbound transactions, 9 positions have transactions every 3 days
    const isIntermittent = posIdx >= 40;
    const step = isIntermittent ? 3 : 1;

    for (let day = 0; day < HISTORY_DAYS; day += step) {
      const dayVariance = ((day * 7 + pos.sku.charCodeAt(pos.sku.length - 1)) % 5) - 2;
      const qty = Math.max(1, (isIntermittent ? dailyBase * 3 : dailyBase) + dayVariance);
      txnData.push({
        orgId: targetOrg,
        sku: pos.sku,
        warehouseId: pos.warehouseId,
        quantity: qty,
        direction: "OUT",
        date: daysAgo(day),
      });
    }

    // Periodic inbound replenishment batches on select SKUs
    if (posIdx % 5 === 0) {
      for (let day = 15; day < HISTORY_DAYS; day += 30) {
        txnData.push({
          orgId: targetOrg,
          sku: pos.sku,
          warehouseId: pos.warehouseId,
          quantity: dailyBase * 30,
          direction: "IN",
          date: daysAgo(day),
        });
      }
    }
  });

  console.log(`Generated ${txnData.length} transactions over 90 days.`);
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < txnData.length; i += CHUNK_SIZE) {
    await prisma.transaction.createMany({
      data: txnData.slice(i, i + CHUNK_SIZE),
    });
  }

  // 5. Purchase Orders (64)
  const poData: {
    orgId: string;
    poNumber: string;
    supplierId: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    orderDate: Date;
    expectedDate: Date;
    receivedDate: Date | null;
  }[] = [];

  let poNumCounter = 8000;

  // SUP-004 (8 POs):
  // 6 Closed late POs (received 6 days late)
  const sup4Skus = ["SKU-1013", "SKU-1014", "SKU-1015", "SKU-1016"];
  const sup4LateOffsets = [80, 70, 60, 50, 40, 30];
  for (let i = 0; i < 6; i++) {
    poNumCounter++;
    const orderDaysAgo = sup4LateOffsets[i];
    const orderD = daysAgo(orderDaysAgo);
    const expectedD = addDaysDate(orderD, 12);
    const receivedD = addDaysDate(expectedD, 6); // +6d late!
    poData.push({
      orgId: targetOrg,
      poNumber: `PO-${poNumCounter}`,
      supplierId: "SUP-004",
      sku: sup4Skus[i % sup4Skus.length],
      quantity: 200,
      unitPrice: 40.00,
      orderDate: orderD,
      expectedDate: expectedD,
      receivedDate: receivedD,
    });
  }

  // 2 Open Overdue POs for SUP-004
  poData.push({
    orgId: targetOrg,
    poNumber: "PO-8063",
    supplierId: "SUP-004",
    sku: "SKU-1015",
    quantity: 500,
    unitPrice: 8.20,
    orderDate: daysAgo(25),
    expectedDate: daysAgo(11), // 11 days overdue!
    receivedDate: null,
  });

  poData.push({
    orgId: targetOrg,
    poNumber: "PO-8064",
    supplierId: "SUP-004",
    sku: "SKU-1013",
    quantity: 150,
    unitPrice: 75.00,
    orderDate: daysAgo(20),
    expectedDate: daysAgo(6), // 6 days overdue!
    receivedDate: null,
  });

  // Remaining 56 POs for the other 5 suppliers (SUP-001, SUP-002, SUP-003, SUP-005, SUP-006)
  const otherSuppliers = supplierDefs.filter((s) => s.supplierId !== "SUP-004");
  const posPerSupplier = [12, 11, 11, 11, 11]; // total = 56

  otherSuppliers.forEach((sup, sIdx) => {
    const count = posPerSupplier[sIdx];
    const supProducts = productDefs.filter((p) => p.supplierId === sup.supplierId);

    for (let pIdx = 0; pIdx < count; pIdx++) {
      poNumCounter++;
      const prod = supProducts[pIdx % supProducts.length];
      const isOpenFuture = pIdx === count - 1;

      if (isOpenFuture) {
        const orderD = daysAgo(2);
        const expectedD = addDaysDate(orderD, sup.leadTimeDays); // future
        poData.push({
          orgId: targetOrg,
          poNumber: `PO-${poNumCounter}`,
          supplierId: sup.supplierId,
          sku: prod.sku,
          quantity: 250,
          unitPrice: prod.unitCost,
          orderDate: orderD,
          expectedDate: expectedD,
          receivedDate: null,
        });
      } else {
        const orderDays = 85 - pIdx * 7;
        const orderD = daysAgo(orderDays);
        const expectedD = addDaysDate(orderD, sup.leadTimeDays);
        const receivedD = addDaysDate(expectedD, -1); // 1 day early (OTIF)
        poData.push({
          orgId: targetOrg,
          poNumber: `PO-${poNumCounter}`,
          supplierId: sup.supplierId,
          sku: prod.sku,
          quantity: 200 + pIdx * 25,
          unitPrice: prod.unitCost,
          orderDate: orderD,
          expectedDate: expectedD,
          receivedDate: receivedD,
        });
      }
    }
  });

  console.log(`Generated ${poData.length} purchase orders.`);
  await prisma.purchaseOrder.createMany({
    data: poData,
  });

  console.log("\n=== Canonical Seed Successfully Completed ===");
  console.log(`  Target Org   : ${targetOrg}`);
  console.log(`  Warehouses   : ${warehouses.length}`);
  console.log(`  Suppliers    : ${supplierDefs.length}`);
  console.log(`  Products     : ${productDefs.length}`);
  console.log(`  Inventory    : ${positions.length}`);
  console.log(`  Transactions : ${txnData.length}`);
  console.log(`  POs          : ${poData.length}`);
}

if (require.main === module) {
  seedCanonicalData(ORG_ID)
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error("Error during seed:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
