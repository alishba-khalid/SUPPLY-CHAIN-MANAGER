import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateSuggestedPurchaseOrders } from "../demand-forecast";
import {
  calculateDayOfWeekMultipliers,
  trimmedDailyDemand,
  winsorizedDailyDemandStandardDeviation,
  overstockThreshold,
  OVERSTOCK_MULTIPLE,
  classifyInventoryStatus,
} from "@/lib/metrics/inventory";
import { computeSupplierPerformance, poOnTimeRate } from "@/lib/metrics/supplier";
import { getAlerts } from "@/lib/insights/alerts";
import type {
  InventoryInsight,
  InventoryRecord,
  InventoryTransaction,
  Product,
  PurchaseOrder,
  Supplier,
  SupplierPerformance,
  Warehouse,
} from "@/types/supply-chain";

describe("Time-Phased Forward Projection & Netting Regression Suite (C4 + V1-V5 + W1-W4)", () => {
  const dummyProduct: Product = {
    id: 1,
    sku: "SKU-1015",
    name: "Nitrile O-Ring 25mm",
    category: "seals",
    unitCost: 0.35,
    supplierId: "SUP-005",
  };

  const dummySupplier: Supplier = {
    id: 1,
    supplierId: "SUP-005",
    name: "Apex Precision Seals",
    leadTimeDays: 7,
    email: "orders@apex.com",
  };

  const dummyWarehouse: Warehouse = {
    id: 1,
    code: "NDC",
    name: "National Distribution Center",
    capacityUnits: 100000,
  };

  test("C4.1 - Gap Case: Stock runs out before inbound arrives -> MUST return expedite/transfer flag", () => {
    const insight: InventoryInsight = {
      sku: "SKU-1015",
      warehouseId: 1,
      availableQuantity: 1890,
      averageDailyDemand: 585,
      daysOfStock: 3.2,
      safetyStock: 1000,
      reorderPoint: 5100,
      overstockThreshold: 20000,
      status: "stock_out_risk",
    };

    const record: InventoryRecord = {
      id: 1,
      sku: "SKU-1015",
      warehouseId: 1,
      quantityOnHand: 1890,
    };

    const in4Days = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const openPo: PurchaseOrder = {
      id: 8061,
      poNumber: "PO-8061",
      supplierId: "SUP-005",
      sku: "SKU-1015",
      quantity: 7560,
      unitPrice: 0.35,
      orderDate: "2026-08-25",
      expectedDate: in4Days,
      receivedDate: null,
    };

    const results = generateSuggestedPurchaseOrders({
      insights: [insight],
      records: [record],
      products: [dummyProduct],
      suppliers: [dummySupplier],
      warehouses: [dummyWarehouse],
      purchaseOrders: [openPo],
    });

    assert.equal(results.length, 1, "Must return an actionable item for the stockout gap");
    const item = results[0];
    assert.ok(
      item.actionType === "expedite" || item.actionType === "transfer",
      `Expected actionType to be expedite or transfer, got ${item.actionType}`
    );
    assert.ok(
      item.reasoning.includes("gap") || item.reasoning.includes("Expedite"),
      `Reasoning must state the interim stockout gap: ${item.reasoning}`
    );
  });

  test("C4.2 - Netting Case: Inbound arrives BEFORE stockout and fully covers horizon -> suggested_qty == 0", () => {
    const insight: InventoryInsight = {
      sku: "SKU-1015",
      warehouseId: 1,
      availableQuantity: 5000,
      averageDailyDemand: 200,
      daysOfStock: 25,
      safetyStock: 500,
      reorderPoint: 2100,
      overstockThreshold: 10000,
      status: "healthy",
    };

    const record: InventoryRecord = {
      id: 1,
      sku: "SKU-1015",
      warehouseId: 1,
      quantityOnHand: 5000,
    };

    const in2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const openPo: PurchaseOrder = {
      id: 8061,
      poNumber: "PO-8061",
      supplierId: "SUP-005",
      sku: "SKU-1015",
      quantity: 3000,
      unitPrice: 0.35,
      orderDate: "2026-08-25",
      expectedDate: in2Days,
      receivedDate: null,
    };

    const results = generateSuggestedPurchaseOrders({
      insights: [insight],
      records: [record],
      products: [dummyProduct],
      suppliers: [dummySupplier],
      warehouses: [dummyWarehouse],
      purchaseOrders: [openPo],
    });

    assert.equal(results.length, 0, "Healthy covered position with early arriving PO must not generate reorders");
  });

  test("C4.3 - Proportionality: 7-day lead time vs 30-day lead time must receive different target cover", () => {
    const sup7: Supplier = { ...dummySupplier, leadTimeDays: 7 };
    const sup30: Supplier = { ...dummySupplier, supplierId: "SUP-030", leadTimeDays: 30 };
    const prod7: Product = { ...dummyProduct, supplierId: "SUP-005" };
    const prod30: Product = { ...dummyProduct, sku: "SKU-30D", supplierId: "SUP-030" };

    const ins7: InventoryInsight = {
      sku: "SKU-1015",
      warehouseId: 1,
      availableQuantity: 0,
      averageDailyDemand: 100,
      daysOfStock: 0,
      safetyStock: 350,
      reorderPoint: 1050,
      overstockThreshold: 4000,
      status: "stock_out_risk",
    };

    const ins30: InventoryInsight = {
      sku: "SKU-30D",
      warehouseId: 1,
      availableQuantity: 0,
      averageDailyDemand: 100,
      daysOfStock: 0,
      safetyStock: 1500,
      reorderPoint: 4500,
      overstockThreshold: 8000,
      status: "stock_out_risk",
    };

    const rec7: InventoryRecord = { id: 1, sku: "SKU-1015", warehouseId: 1, quantityOnHand: 0 };
    const rec30: InventoryRecord = { id: 2, sku: "SKU-30D", warehouseId: 1, quantityOnHand: 0 };

    const results = generateSuggestedPurchaseOrders({
      insights: [ins7, ins30],
      records: [rec7, rec30],
      products: [prod7, prod30],
      suppliers: [sup7, sup30],
      warehouses: [dummyWarehouse],
      purchaseOrders: [],
    });

    const sug7 = results.find((r) => r.sku === "SKU-1015");
    const sug30 = results.find((r) => r.sku === "SKU-30D");

    assert.ok(sug7 && sug30, "Both SKUs must have suggestions");
    assert.ok(
      sug30.targetStock > sug7.targetStock * 2,
      `30-day lead SKU target (${sug30.targetStock}) must be >2x 7-day lead SKU target (${sug7.targetStock})`
    );
  });

  test("C4.4 - Horizon Boundary: Inbound PO arriving AFTER coverage horizon must NOT offset immediate reorder", () => {
    const insight: InventoryInsight = {
      sku: "SKU-1015",
      warehouseId: 1,
      availableQuantity: 100,
      averageDailyDemand: 100,
      daysOfStock: 1,
      safetyStock: 350,
      reorderPoint: 1050,
      overstockThreshold: 4000,
      status: "stock_out_risk",
    };

    const record: InventoryRecord = {
      id: 1,
      sku: "SKU-1015",
      warehouseId: 1,
      quantityOnHand: 100,
    };

    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const farPo: PurchaseOrder = {
      id: 9999,
      poNumber: "PO-FAR-OUT",
      supplierId: "SUP-005",
      sku: "SKU-1015",
      quantity: 50000,
      unitPrice: 0.35,
      orderDate: "2026-08-25",
      expectedDate: in60Days,
      receivedDate: null,
    };

    const results = generateSuggestedPurchaseOrders({
      insights: [insight],
      records: [record],
      products: [dummyProduct],
      suppliers: [dummySupplier],
      warehouses: [dummyWarehouse],
      purchaseOrders: [farPo],
    });

    assert.equal(results.length, 1, "Must trigger a reorder for current period");
    assert.ok(
      results[0].suggestedQuantity > 0,
      "Order quantity must be positive because 60-day inbound PO lands outside horizon"
    );
  });

  test("V2 - Overdue PO Rescheduling: Overdue PO is never credited at day 0; rescheduled based on supplier lateness", () => {
    const sup: Supplier = {
      id: 4,
      supplierId: "SUP-004",
      name: "Orion Electronics Ltd",
      leadTimeDays: 30,
      email: "orders@orion.com",
    };
    const prod: Product = {
      id: 8,
      sku: "SKU-1008",
      name: "PLC Control Module 8CH",
      category: "electronics",
      unitCost: 312,
      supplierId: "SUP-004",
    };

    const insight: InventoryInsight = {
      sku: "SKU-1008",
      warehouseId: 1,
      availableQuantity: 12,
      averageDailyDemand: 2.5,
      daysOfStock: 4.8,
      safetyStock: 30,
      reorderPoint: 100,
      overstockThreshold: 500,
      status: "low_stock",
    };

    const record: InventoryRecord = {
      id: 1,
      sku: "SKU-1008",
      warehouseId: 1,
      quantityOnHand: 12,
    };

    const closedPo: PurchaseOrder = {
      id: 8001,
      poNumber: "PO-8001",
      supplierId: "SUP-004",
      sku: "SKU-1008",
      quantity: 50,
      unitPrice: 312,
      orderDate: "2026-06-01",
      expectedDate: "2026-07-01",
      receivedDate: "2026-07-07",
    };

    const overduePo: PurchaseOrder = {
      id: 8063,
      poNumber: "PO-8063",
      supplierId: "SUP-004",
      sku: "SKU-1008",
      quantity: 100,
      unitPrice: 312,
      orderDate: "2026-07-20",
      expectedDate: "2026-08-22",
      receivedDate: null,
    };

    const results = generateSuggestedPurchaseOrders({
      insights: [insight],
      records: [record],
      products: [prod],
      suppliers: [sup],
      warehouses: [dummyWarehouse],
      purchaseOrders: [closedPo, overduePo],
    });

    assert.equal(results.length, 1);
    const item = results[0];
    assert.ok(
      item.reasoning.includes("overdue") || item.inboundPoDetails?.includes("overdue"),
      "Must state that PO-8063 is overdue and rescheduled based on supplier average"
    );
  });

  test("V3 - Outlier-Resistant Velocity: Extreme spike is trimmed and does not distort structural velocity", () => {
    const transactions: InventoryTransaction[] = [];
    for (let i = 1; i <= 87; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      transactions.push({
        id: i,
        sku: "SKU-1015",
        warehouseId: 1,
        direction: "OUT",
        quantity: 300 + (i % 20),
        date: d,
      });
    }
    for (let i = 88; i <= 90; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      transactions.push({
        id: i,
        sku: "SKU-1015",
        warehouseId: 1,
        direction: "OUT",
        quantity: 10000,
        date: d,
      });
    }

    const trimmed = trimmedDailyDemand(transactions, "SKU-1015", 1, 90, 0.05);
    const winSigma = winsorizedDailyDemandStandardDeviation(transactions, "SKU-1015", 1, 90, 0.05);

    assert.ok(trimmed !== null && trimmed < 400, `Expected trimmed demand ~310, got ${trimmed}`);
    assert.ok(winSigma < 300, `Expected winsorized sigma < 300, got ${winSigma}`);
  });

  test("W3 - Donor Solvency Guard: Proportional target buffer checks individual warehouse on hand", () => {
    const whNdc: Warehouse = { id: 1, code: "NDC", name: "NDC", capacityUnits: 100000 };
    const whWest: Warehouse = { id: 2, code: "WH-WEST", name: "WH-WEST", capacityUnits: 50000 };
    const whEast: Warehouse = { id: 3, code: "WH-EAST", name: "WH-EAST", capacityUnits: 50000 };

    const insNdc: InventoryInsight = {
      sku: "SKU-1008",
      warehouseId: 1,
      availableQuantity: 12,
      averageDailyDemand: 2.5,
      daysOfStock: 4.8,
      safetyStock: 30,
      reorderPoint: 100,
      overstockThreshold: 500,
      status: "low_stock",
    };

    const insWest: InventoryInsight = {
      sku: "SKU-1008",
      warehouseId: 2,
      availableQuantity: 5,
      averageDailyDemand: 1.5,
      daysOfStock: 3.3,
      safetyStock: 20,
      reorderPoint: 60,
      overstockThreshold: 300,
      status: "low_stock",
    };

    const insEast: InventoryInsight = {
      sku: "SKU-1008",
      warehouseId: 3,
      availableQuantity: 200,
      averageDailyDemand: 1.0,
      daysOfStock: 200,
      safetyStock: 15,
      reorderPoint: 45,
      overstockThreshold: 100,
      status: "overstock",
    };

    const recNdc: InventoryRecord = { id: 1, sku: "SKU-1008", warehouseId: 1, quantityOnHand: 12 };
    const recWest: InventoryRecord = { id: 2, sku: "SKU-1008", warehouseId: 2, quantityOnHand: 5 };
    const recEast: InventoryRecord = { id: 3, sku: "SKU-1008", warehouseId: 3, quantityOnHand: 200 };

    const prod: Product = {
      id: 8,
      sku: "SKU-1008",
      name: "PLC Control Module 8CH",
      category: "electronics",
      unitCost: 312,
      supplierId: "SUP-004",
    };
    const sup: Supplier = {
      id: 4,
      supplierId: "SUP-004",
      name: "Orion Electronics Ltd",
      leadTimeDays: 30,
      email: "orders@orion.com",
    };

    const in12Days = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const po: PurchaseOrder = {
      id: 8059,
      poNumber: "PO-8059",
      supplierId: "SUP-004",
      sku: "SKU-1008",
      quantity: 72,
      unitPrice: 312,
      orderDate: "2026-08-01",
      expectedDate: in12Days,
      receivedDate: null,
    };

    const results = generateSuggestedPurchaseOrders({
      insights: [insNdc, insWest, insEast],
      records: [recNdc, recWest, recEast],
      products: [prod],
      suppliers: [sup],
      warehouses: [whNdc, whWest, whEast],
      purchaseOrders: [po],
    });

    const sugNdc = results.find((r) => r.sku === "SKU-1008" && r.warehouseCode === "NDC");
    assert.ok(sugNdc, "Must produce suggestion for NDC");
    assert.equal(sugNdc.surplusWarehouseCode, "WH-EAST", "WH-EAST has surplus and must be selected");
    assert.notEqual(sugNdc.surplusWarehouseCode, "WH-WEST", "WH-WEST must NEVER be proposed as a donor");
  });

  test("W4 - Normalise Day-of-Week Multipliers: sum(multipliers) must equal 7.000 within tolerance", () => {
    const transactions: InventoryTransaction[] = [];
    const baseDate = new Date("2026-09-02T00:00:00Z");

    for (let i = 0; i < 90; i++) {
      const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dow = d.getUTCDay();
      // Weekends have 20 units, weekdays have 100 units
      const qty = dow === 0 || dow === 6 ? 20 : 100;
      transactions.push({
        id: i + 1,
        sku: "SKU-1015",
        warehouseId: 1,
        direction: "OUT",
        quantity: qty,
        date: d.toISOString().slice(0, 10),
      });
    }

    const multipliers = calculateDayOfWeekMultipliers(transactions, "SKU-1015", 1, 90);
    assert.equal(multipliers.length, 7, "Must have exactly 7 daily multipliers");

    const sum = multipliers.reduce((a, b) => a + b, 0);
    assert.ok(
      Math.abs(sum - 7.0) < 0.01,
      `Expected sum of day-of-week multipliers to equal 7.000, got ${sum.toFixed(3)}`
    );

    // Weekend multipliers (Sun=0, Sat=6) should be lower than weekday multipliers (Mon-Fri)
    assert.ok(multipliers[0] < multipliers[1], "Sunday multiplier must be lower than Monday");
    assert.ok(multipliers[6] < multipliers[2], "Saturday multiplier must be lower than Tuesday");
  });

  test("W1 & W2 - Overstock Rollup in getAlerts: produces 1 aggregate overstock alert", async () => {
    const insights: InventoryInsight[] = [
      {
        sku: "SKU-1015",
        warehouseId: 1,
        availableQuantity: 0,
        averageDailyDemand: 100,
        daysOfStock: 0,
        safetyStock: 350,
        reorderPoint: 1050,
        overstockThreshold: 4000,
        status: "stock_out_risk",
      },
      {
        sku: "SKU-1001",
        warehouseId: 1,
        availableQuantity: 5000,
        averageDailyDemand: 10,
        daysOfStock: 500,
        safetyStock: 50,
        reorderPoint: 150,
        overstockThreshold: 500,
        status: "overstock",
      },
      {
        sku: "SKU-1002",
        warehouseId: 1,
        availableQuantity: 8000,
        averageDailyDemand: 20,
        daysOfStock: 400,
        safetyStock: 100,
        reorderPoint: 300,
        overstockThreshold: 1000,
        status: "overstock",
      },
    ];

    const alerts = await getAlerts("dummy-org", {
      insights,
      supplierPerf: [],
      openPOs: [],
      products: [dummyProduct],
      suppliers: [dummySupplier],
      warehouses: [dummyWarehouse],
    });

    const stockoutAlerts = alerts.filter((a) => a.id.startsWith("ALT-INV-STOCKOUT"));
    const overstockAlerts = alerts.filter((a) => a.id.includes("OVERSTOCK"));

    assert.equal(stockoutAlerts.length, 1, "Must have 1 individual stockout alert");
    assert.equal(overstockAlerts.length, 1, "Must roll up multiple overstock positions into exactly 1 aggregate alert");
    assert.ok(
      overstockAlerts[0].title.includes("2 positions overstocked"),
      `Aggregate title must state count: ${overstockAlerts[0].title}`
    );
  });

  test("X1 - Supplier OTIF: Open overdue POs MUST count against OTIF and be in denominator", () => {
    // 6 closed late POs (received late) + 2 open overdue POs (expectedDate in past, receivedDate = null)
    const testPOs: PurchaseOrder[] = [
      { id: 1, poNumber: "PO-8001", supplierId: "SUP-004", sku: "SKU-1001", quantity: 100, unitPrice: 10, orderDate: "2026-06-01", expectedDate: "2026-06-15", receivedDate: "2026-06-21" }, // +6d late
      { id: 2, poNumber: "PO-8002", supplierId: "SUP-004", sku: "SKU-1001", quantity: 100, unitPrice: 10, orderDate: "2026-06-10", expectedDate: "2026-06-25", receivedDate: "2026-07-01" }, // +6d late
      { id: 3, poNumber: "PO-8003", supplierId: "SUP-004", sku: "SKU-1001", quantity: 100, unitPrice: 10, orderDate: "2026-07-01", expectedDate: "2026-07-15", receivedDate: "2026-07-21" }, // +6d late
      { id: 4, poNumber: "PO-8004", supplierId: "SUP-004", sku: "SKU-1001", quantity: 100, unitPrice: 10, orderDate: "2026-07-10", expectedDate: "2026-07-25", receivedDate: "2026-07-31" }, // +6d late
      { id: 5, poNumber: "PO-8005", supplierId: "SUP-004", sku: "SKU-1001", quantity: 100, unitPrice: 10, orderDate: "2026-08-01", expectedDate: "2026-08-15", receivedDate: "2026-08-21" }, // +6d late
      { id: 6, poNumber: "PO-8006", supplierId: "SUP-004", sku: "SKU-1001", quantity: 100, unitPrice: 10, orderDate: "2026-08-10", expectedDate: "2026-08-20", receivedDate: "2026-08-26" }, // +6d late
      { id: 7, poNumber: "PO-8063", supplierId: "SUP-004", sku: "SKU-1001", quantity: 100, unitPrice: 10, orderDate: "2026-08-10", expectedDate: "2026-08-22", receivedDate: null }, // OPEN OVERDUE 11d
      { id: 8, poNumber: "PO-8064", supplierId: "SUP-004", sku: "SKU-1001", quantity: 100, unitPrice: 10, orderDate: "2026-08-15", expectedDate: "2026-08-27", receivedDate: null }, // OPEN OVERDUE 6d
    ];

    const perf = computeSupplierPerformance("SUP-004", testPOs, 90);
    assert.equal(perf.eligiblePurchaseOrders, 8, "Eligible POs must include both 6 closed late orders + 2 open overdue orders = 8");
    assert.equal(perf.onTimeInFullCount, 0, "No orders were delivered on time");
    assert.equal(perf.otifPercent, 0, "OTIF percent must be 0% (0 / 8 on-time)");
  });

  test("X2 - Overstock Threshold: Scales with lead time (target_stock x 3.0)", () => {
    assert.equal(OVERSTOCK_MULTIPLE, 3.0, "OVERSTOCK_MULTIPLE constant must equal 3.0");

    // Case A: Short lead time (7 days, 100 units/day, safetyStock = 350)
    // targetStock = (7 + 1) * 100 + 350 = 1150
    // overstockThreshold = 1150 * 3.0 = 3450
    const otShort = overstockThreshold(100, 7, 0); // ss = 100 * 7 * 0.5 = 350 -> target = 800 + 350 = 1150
    assert.equal(otShort, 3450, "7-day lead time overstock threshold must be 3x 1150 = 3450");

    // Case B: Long lead time (30 days, 10 units/day, safetyStock = 150)
    // targetStock = (30 + 1) * 10 + 150 = 460
    // overstockThreshold = 460 * 3.0 = 1380
    const otLong = overstockThreshold(10, 30, 0); // ss = 10 * 30 * 0.5 = 150 -> target = 310 + 150 = 460
    assert.equal(otLong, 1380, "30-day lead time overstock threshold must be 3x 460 = 1380");

    // Case C: Holding 30 days of cover (300 units) on a 30-day lead time item
    // Under old flat 30-day rule it was overstock; under 3x target stock (1380), 300 units is HEALTHY
    const status30d = classifyInventoryStatus({
      availableQuantity: 300,
      avgDailyDemand: 10,
      daysOfStockValue: 30,
      safetyStockValue: 150,
      overstockThresholdValue: 1380,
    });
    assert.equal(status30d, "healthy", "Holding 30 days of cover on a 30-day lead time item is healthy, NOT overstock");
  });
});
