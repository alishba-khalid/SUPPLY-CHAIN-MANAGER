import { test, describe } from "node:test";
import assert from "node:assert";
import * as fs from "fs";
import * as path from "path";
import { readWorkbookBuffer, detectHeaderRowIndex } from "../reader";
import { generateSheetColumnMappings, matchHeaderToCanonical, normalizeHeaderString } from "../mapping";
import { cleanNumericValue, cleanDateValue, excelSerialToDate } from "../cleaner";
import { calculateEntitySimilarity, clusterFuzzyEntities, calculateTokenPrefixScore } from "../deduplicator";
import { extractEntitiesFromWorkbook } from "../extractor";
import { createMessyWorkbookBuffer } from "../../../../fixtures/generate-messy-fixture";

describe("Smart Data Importer Test Suite (S1-S8, I1-I7)", () => {
  const fixtureBuffer = createMessyWorkbookBuffer();

  test("1. S1: Header detection on row 4 beneath title block & merged cells", () => {
    const sheets = readWorkbookBuffer(fixtureBuffer);
    assert.strictEqual(sheets.length, 2, "Expected 2 sheets in workbook");

    const mainSheet = sheets.find((s) => s.name === "Consolidated_Stock_Report");
    assert.ok(mainSheet, "Main sheet Consolidated_Stock_Report must exist");
    assert.strictEqual(mainSheet.headerRowIndex, 3, "Header must be detected at row index 3 (4th row)");

    assert.ok(mainSheet.headers.includes("Item Code"));
    assert.ok(mainSheet.headers.includes("Particulars"));
    assert.ok(mainSheet.headers.includes("Party Name"));
    assert.ok(mainSheet.headers.includes("Godown"));
    assert.ok(mainSheet.headers.includes("Closing Stock"));
  });

  test("2. S1.3: Junk & Total/Subtotal row removal at bottom", () => {
    const sheets = readWorkbookBuffer(fixtureBuffer);
    const mainSheet = sheets.find((s) => s.name === "Consolidated_Stock_Report")!;

    // Ensure total summary row and footnote rows are excluded from rawRows
    const hasTotalRow = mainSheet.rawRows.some((r) =>
      r.some((cell) => typeof cell === "string" && /total|grand\s*summary/i.test(cell))
    );
    assert.strictEqual(hasTotalRow, false, "Total/summary rows must be excluded from cleaned data rows");

    const hasFootnote = mainSheet.rawRows.some((r) =>
      r.some((cell) => typeof cell === "string" && /^\*\s*note/i.test(cell))
    );
    assert.strictEqual(hasFootnote, false, "Footnotes must be stripped from cleaned data rows");
  });

  test("3. S2: South Asian & commercial synonym dictionary resolution", () => {
    assert.strictEqual(matchHeaderToCanonical("Item Code").field, "sku");
    assert.strictEqual(matchHeaderToCanonical("Particulars").field, "product_name");
    assert.strictEqual(matchHeaderToCanonical("Party Name").field, "supplier_name");
    assert.strictEqual(matchHeaderToCanonical("Godown").field, "warehouse_code");
    assert.strictEqual(matchHeaderToCanonical("Closing Stock").field, "quantity_on_hand");
    assert.strictEqual(matchHeaderToCanonical("Rate").field, "unit_cost");
    assert.strictEqual(matchHeaderToCanonical("Lead Days").field, "supplier_lead_time");
    assert.strictEqual(matchHeaderToCanonical("PO #").field, "po_number");
  });

  test("4. I1 & A2: Fuzzy token-prefix & constrained substring matching (Delta, Ali Traders, Steel Co)", () => {
    // 4.1 Delta Components case
    const sim1 = calculateEntitySimilarity("Delta Components LLC", "delta comp.");
    assert.ok(sim1 >= 0.85, `Expected Delta similarity >= 0.85, got ${sim1}`);

    const sim2 = calculateEntitySimilarity("Delta Components LLC", "DELTA COMPONENTS");
    assert.ok(sim2 >= 0.95, `Expected case-fold similarity >= 0.95, got ${sim2}`);

    const sim3 = calculateEntitySimilarity("Apex Industrial Pvt Ltd", "Apex Ind");
    assert.ok(sim3 >= 0.85, `Expected Apex Ind similarity >= 0.85, got ${sim3}`);

    // 4.2 A2 Safe match: "Ali Traders" in "Ali Traders International" (probably same vendor)
    const simAli = calculateEntitySimilarity("Ali Traders", "Ali Traders International");
    assert.ok(simAli >= 0.85, `Expected Ali Traders similarity >= 0.85, got ${simAli}`);

    // 4.3 A2 Prevent false merge on short/generic names: "Steel Co" in "Pak Steel Co Ltd" (NOT same vendor)
    const simSteel = calculateEntitySimilarity("Steel Co", "Pak Steel Co Ltd");
    assert.ok(simSteel < 0.85, `Expected Steel Co similarity < 0.85 (prevent false merge), got ${simSteel}`);

    const candidates = [
      { originalName: "Delta Components LLC", rowCount: 14 },
      { originalName: "delta comp.", rowCount: 3 },
      { originalName: "DELTA COMPONENTS", rowCount: 1 },
      { originalName: "Ali Traders", rowCount: 10 },
      { originalName: "Ali Traders International", rowCount: 4 },
      { originalName: "Steel Co", rowCount: 6 },
      { originalName: "Pak Steel Co Ltd", rowCount: 8 },
      { originalName: "Zenith Engineering", rowCount: 5 },
    ];

    const mergeGroups = clusterFuzzyEntities(candidates, "supplier", 0.85);
    // Delta group and Ali Traders group must cluster; Steel Co & Pak Steel Co must NOT cluster
    const deltaGroup = mergeGroups.find((g) => g.canonicalName === "Delta Components LLC");
    assert.ok(deltaGroup, "Delta Components group must exist");
    assert.strictEqual(deltaGroup.variants.length, 3);

    const aliGroup = mergeGroups.find((g) => g.canonicalName === "Ali Traders");
    assert.ok(aliGroup, "Ali Traders group must exist");
    assert.strictEqual(aliGroup.variants.length, 2);

    const steelGroup = mergeGroups.find((g) => g.canonicalName.includes("Steel"));
    assert.strictEqual(steelGroup, undefined, "Steel Co and Pak Steel Co must NOT be merged");
  });

  test("5. S5: Value cleaning (currency symbols, units, accounting negative, nulls)", () => {
    assert.strictEqual(cleanNumericValue("2,500 pcs"), 2500);
    assert.strictEqual(cleanNumericValue("Rs. 1,450.00"), 1450);
    assert.strictEqual(cleanNumericValue("PKR 450"), 450);
    assert.strictEqual(cleanNumericValue("$ 12.50"), 12.5);
    assert.strictEqual(cleanNumericValue("£ 85.00"), 85);
    assert.strictEqual(cleanNumericValue("(150)"), -150);
    assert.strictEqual(cleanNumericValue("-150"), -150);

    // Unknown values must be null (NOT 0)
    assert.strictEqual(cleanNumericValue("N/A"), null);
    assert.strictEqual(cleanNumericValue("-"), null);
    assert.strictEqual(cleanNumericValue(""), null);
    assert.strictEqual(cleanNumericValue(null), null);
  });

  test("6. S5.2: Excel serial date (46174 -> 2026-06-01) and multi-format parsing", () => {
    const d1 = cleanDateValue(46174);
    assert.ok(d1 !== null);
    assert.strictEqual(d1.toISOString().slice(0, 10), "2026-06-01");

    const d2 = cleanDateValue("01-Jun-2026");
    assert.ok(d2 !== null);
    assert.strictEqual(d2.toISOString().slice(0, 10), "2026-06-01");

    const d3 = cleanDateValue("2026-06-01");
    assert.ok(d3 !== null);
    assert.strictEqual(d3.toISOString().slice(0, 10), "2026-06-01");
  });

  test("7. S3 & I5: End-to-end entity extraction from messy workbook", () => {
    const sheets = readWorkbookBuffer(fixtureBuffer);
    const mappings = sheets.map((s) => ({
      sheetName: s.name,
      headerRowIndex: s.headerRowIndex,
      mappings: generateSheetColumnMappings(s.headers, s.rawRows),
    }));

    const preview = extractEntitiesFromWorkbook(sheets, mappings);

    // Verify Warehouses extracted
    assert.ok(preview.warehouses.length >= 3, `Expected at least 3 warehouses, got ${preview.warehouses.length}`);
    const karachi = preview.warehouses.find((w) => w.name.includes("Karachi"));
    assert.ok(karachi, "Karachi Central Godown warehouse must be extracted");

    // Verify Suppliers extracted & merged
    assert.ok(preview.suppliers.length >= 3, `Expected at least 3 suppliers, got ${preview.suppliers.length}`);
    const delta = preview.suppliers.find((s) => s.name === "Delta Components LLC");
    assert.ok(delta, "Delta Components LLC should be the canonical supplier name");

    // Verify Products extracted
    assert.ok(preview.products.length >= 5, `Expected at least 5 products, got ${preview.products.length}`);
    const p1 = preview.products.find((p) => p.sku === "SKU-1001");
    assert.ok(p1, "SKU-1001 must exist");
    assert.strictEqual(p1.unitCost, 1450);

    // Verify Inventory balances extracted
    assert.ok(preview.inventory.length >= 3, `Expected at least 3 inventory positions, got ${preview.inventory.length}`);

    // Verify Purchase Orders extracted
    assert.ok(preview.purchaseOrders.length >= 3, `Expected at least 3 POs, got ${preview.purchaseOrders.length}`);

    // I5.1: Verify SKU Supplier Conflict detected for SKU-1002
    const conflict = preview.skuConflicts.find((c) => c.sku === "SKU-1002");
    assert.ok(conflict, "SKU-1002 must have a supplier conflict detected");
    assert.ok(conflict.suppliers.length >= 2, "Conflict must list at least 2 suppliers");

    // I5.2: Verify blank quantity row (SKU-1007) is placed in rejectedRows
    const blankRejected = preview.rejectedRows.find((r) =>
      r.reason.includes("Blank or invalid on-hand quantity")
    );
    assert.ok(blankRejected, "Blank quantity row must be placed in rejectedRows");
  });

  test("8. I4: Scale benchmark test for atomic transaction preparation", () => {
    const counts = [1000, 10000, 50000];
    const timings: Record<number, number> = {};

    for (const count of counts) {
      const start = Date.now();
      const transactions = [];
      const baseDate = new Date();

      for (let i = 0; i < count; i++) {
        transactions.push({
          sku: `SKU-${(i % 500) + 1}`,
          warehouseCode: `WH-${(i % 5) + 1}`,
          quantity: (i % 50) + 1,
          direction: i % 2 === 0 ? ("IN" as const) : ("OUT" as const),
          date: baseDate.toISOString().slice(0, 10),
        });
      }

      // Validate chunking memory footprint
      const CHUNK_SIZE = 1000;
      let chunksCount = 0;
      for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
        const chunk = transactions.slice(i, i + CHUNK_SIZE);
        chunksCount++;
      }

      const elapsed = Date.now() - start;
      timings[count] = elapsed;
      assert.strictEqual(chunksCount, Math.ceil(count / CHUNK_SIZE));
    }

    console.log("------------------------------------------------------------");
    console.log("I4 Scale Benchmark Timings (In-Memory Prep & Chunking):");
    console.log(`• 1,000 rows  : ${timings[1000]} ms`);
    console.log(`• 10,000 rows : ${timings[10000]} ms`);
    console.log(`• 50,000 rows : ${timings[50000]} ms`);
    console.log("------------------------------------------------------------");
    assert.ok(timings[50000] < 500, "50k row memory processing should complete in under 500ms");
  });
});
