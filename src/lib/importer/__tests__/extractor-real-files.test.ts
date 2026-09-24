/**
 * Extractor correctness on real import files: counts, and that details from
 * the source survive (no supplier auto-merging across Supplier IDs, no product
 * rows overwritten by later rows mentioning the same SKU).
 *
 * The user's test files are not committed; they are read from
 * IMPORT_TEST_FILES_DIR (default: ~/Downloads). A test whose file is missing
 * is skipped with a message rather than silently passing.
 */
import { test, describe } from "node:test";
import assert from "node:assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { readWorkbookBuffer } from "../reader";
import { generateSheetColumnMappings } from "../mapping";
import { extractEntitiesFromWorkbook, type ExtractionOptions } from "../extractor";
import { buildEntityMergeGroups } from "../deduplicator";
import { computeSupplierPerformance } from "../../metrics/supplier";
import type { ExtractionPreview, RawParsedSheet } from "../types";
import { splitAllInOneIntoTemplates, TEMPLATE_FILES } from "../../../../fixtures/split-all-in-one";

const FILES_DIR = process.env.IMPORT_TEST_FILES_DIR ?? path.join(os.homedir(), "Downloads");
const ALL_IN_ONE = path.join(FILES_DIR, "ALL_IN_ONE_test_data.csv");
const UNDER_5000 = path.join(FILES_DIR, "ALL_IN_ONE_under_5000_rows.csv");
const MESSY_REPO = path.join(__dirname, "../../../../fixtures/messy_inventory_workbook.xlsx");

const skipUnless = (file: string) => (fs.existsSync(file) ? false : `missing ${file}`);

function extractSheets(sheets: RawParsedSheet[], options: ExtractionOptions = {}): ExtractionPreview {
  const mappings = sheets.map((s) => ({
    sheetName: s.name,
    headerRowIndex: s.headerRowIndex,
    mappings: generateSheetColumnMappings(s.headers, s.rawRows),
  }));
  return extractEntitiesFromWorkbook(sheets, mappings, options);
}
const extractBuffer = (buf: Buffer | Uint8Array, options: ExtractionOptions = {}) => extractSheets(readWorkbookBuffer(buf), options);

function counts(p: ExtractionPreview, describedOnly = false) {
  const keep = <T extends { referenceOnly?: boolean }>(xs: T[]) => (describedOnly ? xs.filter((x) => !x.referenceOnly) : xs);
  return [
    keep(p.warehouses).length,
    keep(p.suppliers).length,
    keep(p.products).length,
    p.inventory.length,
    p.purchaseOrders.length,
    p.transactions.length,
  ];
}

/** Plain CSV rows keyed by header (the test files have no quoted commas). */
function csvRows(file: string): Record<string, string>[] {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => {
    const c = l.split(",");
    return Object.fromEntries(header.map((h, i) => [h, c[i] ?? ""]));
  });
}

describe("a. ALL_IN_ONE_test_data.csv (21,586 rows)", { skip: skipUnless(ALL_IN_ONE) }, () => {
  const load = () => extractBuffer(fs.readFileSync(ALL_IN_ONE));

  test("exact counts: 3 warehouses, 8 suppliers, 250 products, 466 stock, 484 POs, 20,375 transactions", () => {
    const p = load();
    assert.deepStrictEqual(counts(p), [3, 8, 250, 466, 484, 20_375]);
    assert.strictEqual(p.rejectedRows.length, 0, "no row of an all-in-one file should be rejected");
    assert.strictEqual(p.mergeGroups.length, 0, "8 distinct Supplier IDs: nothing to merge");
    assert.strictEqual(p.productConflicts.length, 0);
    assert.strictEqual(p.skuConflicts.length, 0);
  });

  test("names, unit costs and suppliers match the CSV for 20 sampled SKUs; warehouse and supplier names kept", () => {
    const p = load();
    const rows = csvRows(ALL_IN_ONE);
    const productRows = rows.filter((r) => r["Record Type"] === "PRODUCT");
    const sample = Array.from({ length: 20 }, (_, i) => productRows[i * 12]);
    for (const src of sample) {
      const got = p.products.find((x) => x.sku === src.SKU);
      assert.ok(got, `${src.SKU} missing`);
      assert.strictEqual(got.name, src["Product Name"], `${src.SKU} name`);
      assert.strictEqual(got.unitCost, Number(src["Unit Cost"]), `${src.SKU} unit cost`);
      assert.strictEqual(got.supplierId, src["Supplier ID"], `${src.SKU} supplier`);
      assert.strictEqual(got.category, src.Category, `${src.SKU} category`);
    }
    for (const w of rows.filter((r) => r["Record Type"] === "WAREHOUSE")) {
      assert.strictEqual(p.warehouses.find((x) => x.code === w["Warehouse Code"])?.name, w["Warehouse Name"]);
    }
    for (const s of rows.filter((r) => r["Record Type"] === "SUPPLIER")) {
      const got = p.suppliers.find((x) => x.supplierId === s["Supplier ID"]);
      assert.strictEqual(got?.name, s["Supplier Name"]);
      assert.strictEqual(got?.leadTimeDays, Number(s["Lead Time (Days)"]));
    }
  });

  test("every PO keeps its own supplier, and SUP-004 ranks worst on on-time delivery", () => {
    const p = load();
    const csvPoSupplier = new Map(csvRows(ALL_IN_ONE).filter((r) => r["Record Type"] === "PURCHASE_ORDER").map((r) => [r["PO Number"], r["Supplier ID"]]));
    for (const po of p.purchaseOrders) assert.strictEqual(po.supplierId, csvPoSupplier.get(po.poNumber), po.poNumber);

    // Wide window so the ranking doesn't depend on today's date.
    const pos = p.purchaseOrders.map((po, i) => ({ id: i + 1, ...po }));
    const ranked = p.suppliers
      .map((s) => ({ id: s.supplierId, otif: computeSupplierPerformance(s.supplierId, pos, 3650).otifPercent ?? 101 }))
      .sort((a, b) => a.otif - b.otif);
    assert.strictEqual(ranked[0].id, "SUP-004", `worst on-time: ${JSON.stringify(ranked.slice(0, 3))}`);
  });
});

describe("b. ALL_IN_ONE_under_5000_rows.csv", { skip: skipUnless(UNDER_5000) }, () => {
  test("counts: 3 / 8 / 42 / 85 / 95 / 4,584", () => {
    assert.deepStrictEqual(counts(extractBuffer(fs.readFileSync(UNDER_5000))), [3, 8, 42, 85, 95, 4_584]);
  });
});

describe("c. six template CSVs (split from the 21,586-row file)", { skip: skipUnless(ALL_IN_ONE) }, () => {
  const templates = () => splitAllInOneIntoTemplates(fs.readFileSync(ALL_IN_ONE, "utf8"));

  test("each file imported on its own describes only its own records: together 3 / 8 / 250 / 466 / 484 / 20,375", () => {
    const files = templates();
    const described = { warehouses: new Set<string>(), suppliers: new Set<string>(), products: new Set<string>() };
    const totals = [0, 0, 0, 0, 0, 0];
    for (const name of TEMPLATE_FILES) {
      const p = extractBuffer(Buffer.from(files[name]));
      assert.strictEqual(p.rejectedRows.length, 0, `${name}: rejected rows`);
      p.warehouses.filter((w) => !w.referenceOnly).forEach((w) => described.warehouses.add(w.code));
      p.suppliers.filter((s) => !s.referenceOnly).forEach((s) => described.suppliers.add(s.supplierId));
      p.products.filter((x) => !x.referenceOnly).forEach((x) => described.products.add(x.sku));
      totals[3] += p.inventory.length;
      totals[4] += p.purchaseOrders.length;
      totals[5] += p.transactions.length;
      // Anything this file only mentions must not carry placeholder details
      // that could overwrite the real record.
      if (name !== "warehouses.csv") assert.ok(p.warehouses.every((w) => w.referenceOnly), `${name}: warehouses must be reference-only`);
      if (name !== "suppliers.csv") assert.ok(p.suppliers.every((s) => s.referenceOnly), `${name}: suppliers must be reference-only`);
      if (name !== "products.csv") assert.ok(p.products.every((x) => x.referenceOnly), `${name}: products must be reference-only`);
    }
    totals[0] = described.warehouses.size;
    totals[1] = described.suppliers.size;
    totals[2] = described.products.size;
    assert.deepStrictEqual(totals, [3, 8, 250, 466, 484, 20_375]);
  });

  test("the same six files as one six-sheet workbook give 3 / 8 / 250 / 466 / 484 / 20,375 with names intact", () => {
    const files = templates();
    const sheets = TEMPLATE_FILES.map((name) => ({ ...readWorkbookBuffer(Buffer.from(files[name]))[0], name }));
    const p = extractSheets(sheets);
    assert.deepStrictEqual(counts(p), [3, 8, 250, 466, 484, 20_375]);
    assert.strictEqual(p.warehouses.find((w) => w.code === "NDC")?.name, "National Distribution Center");
    assert.strictEqual(p.suppliers.find((s) => s.supplierId === "SUP-004")?.name, "Orion Electronics");
    assert.strictEqual(p.products.find((x) => x.sku === "SKU-1001")?.name, "Gear Oil XL");
    assert.ok(p.products.every((x) => !x.referenceOnly));
  });

  test("template headers resolve from context: Name, Quantity, Date and Unit Price", () => {
    const files = templates();
    const map = (name: (typeof TEMPLATE_FILES)[number]) => {
      const s = readWorkbookBuffer(Buffer.from(files[name]))[0];
      return Object.fromEntries(generateSheetColumnMappings(s.headers, s.rawRows).map((m) => [m.rawHeader, m.canonicalField]));
    };
    assert.strictEqual(map("warehouses.csv").Name, "warehouse_name");
    assert.strictEqual(map("suppliers.csv").Name, "supplier_name");
    assert.strictEqual(map("products.csv").Name, "product_name");
    assert.strictEqual(map("purchase_orders.csv").Quantity, "po_quantity");
    assert.strictEqual(map("purchase_orders.csv")["Unit Price"], "po_unit_price");
    assert.strictEqual(map("transactions.csv").Quantity, "transaction_qty");
    assert.strictEqual(map("transactions.csv").Date, "transaction_date");
  });
});

describe("d. messy workbook (repo fixture; messy_acme_workbook.xlsx not available)", () => {
  const buf = () => fs.readFileSync(MESSY_REPO);

  test("header row found under the title block; TOTAL and footnote rows dropped", () => {
    const sheet = readWorkbookBuffer(buf()).find((s) => s.name === "Consolidated_Stock_Report")!;
    assert.strictEqual(sheet.headerRowIndex, 3);
    const cells = sheet.rawRows.flat().map((c) => String(c ?? ""));
    assert.ok(!cells.some((c) => /total|grand summary/i.test(c)), "TOTAL row must be dropped");
    assert.ok(!cells.some((c) => /^\*\s*note/i.test(c)), "footnote must be dropped");
  });

  test("vendor typos are flagged for merge but NOT merged; same-name variants are merged and listed", () => {
    const p = extractBuffer(buf());
    const similar = p.mergeGroups.filter((g) => g.matchKind === "similar");
    const typos = similar.flatMap((g) => g.variants.map((v) => v.originalName));
    assert.ok(typos.includes("delta comp."), "'delta comp.' must be flagged");
    assert.ok(typos.includes("Apex Ind"), "'Apex Ind' must be flagged");
    assert.ok(similar.every((g) => !g.isConfirmed), "suggestions must not be pre-ticked");
    assert.ok(p.suppliers.some((s) => s.name === "delta comp."), "not merged unless the user ticks it");
    assert.ok(p.suppliers.some((s) => s.name === "Apex Ind"));

    const same = p.mergeGroups.find((g) => g.matchKind === "same-name" && g.variants.some((v) => v.originalName === "DELTA COMPONENTS"));
    assert.ok(same?.isConfirmed, "'DELTA COMPONENTS' is clearly the same as 'Delta Components LLC' and is listed");

    // Ticking the suggestion merges it.
    const ticked = p.mergeGroups.map((g) => (g.variants.some((v) => v.originalName === "delta comp.") ? { ...g, isConfirmed: true } : g));
    const merged = extractBuffer(buf(), { mergeGroups: ticked });
    assert.ok(!merged.suppliers.some((s) => s.name === "delta comp."));
    assert.strictEqual(merged.products.find((x) => x.sku === "SKU-1003")?.supplierId, "SUP-001");
  });

  test("duplicate SKU + location is reported, and both sum and keep-last are honoured", () => {
    const p = extractBuffer(buf());
    const dup = p.duplicateStockPositions.find((d) => d.sku === "SKU-1002");
    assert.ok(dup, "SKU-1002 appears twice at the same warehouse");
    assert.deepStrictEqual(dup.quantities, [1200, 800]);
    const qty = (o: ExtractionOptions) => extractBuffer(buf(), o).inventory.find((i) => i.sku === "SKU-1002")!.quantityOnHand;
    assert.strictEqual(qty({ skuDuplicateResolution: "sum" }), 2000);
    assert.strictEqual(qty({ skuDuplicateResolution: "last" }), 800);
  });

  test("same SKU with different details is reported, first value kept unless the user picks another", () => {
    const p = extractBuffer(buf());
    const conflict = p.productConflicts.find((c) => c.sku === "SKU-1002" && c.field === "unitCost");
    assert.ok(conflict, "450 vs 460 must be reported");
    assert.deepStrictEqual(conflict.options.map((o) => o.value), [450, 460]);
    assert.strictEqual(p.products.find((x) => x.sku === "SKU-1002")?.unitCost, 450);
    const picked = extractBuffer(buf(), { productConflictResolutions: { "SKU-1002|unitCost": 1 } });
    assert.strictEqual(picked.products.find((x) => x.sku === "SKU-1002")?.unitCost, 460);
  });
});

describe("identity rules", () => {
  test("suppliers with different Supplier IDs never merge, however similar the IDs or names look", () => {
    const groups = buildEntityMergeGroups(
      [
        { originalName: "SUP-001", rowCount: 5, entityId: "SUP-001" },
        { originalName: "SUP-002", rowCount: 5, entityId: "SUP-002" },
        { originalName: "Delta Components", rowCount: 5, entityId: "SUP-010" },
        { originalName: "Delta Components LLC", rowCount: 5, entityId: "SUP-011" },
      ],
      "supplier"
    );
    for (const g of groups) {
      const ids = new Set(g.variants.map((v) => v.entityId).filter(Boolean));
      assert.ok(ids.size <= 1, `group ${g.canonicalName} mixes IDs ${[...ids].join(", ")}`);
    }
  });

  test("a SKU mentioned only on stock rows is reference-only and never takes a placeholder name", () => {
    const sheets = readWorkbookBuffer(Buffer.from("SKU,Warehouse Code,Quantity On Hand\nSKU-9,NDC,5"));
    const p = extractSheets(sheets);
    assert.strictEqual(p.products[0].referenceOnly, true);
    assert.strictEqual(p.warehouses[0].referenceOnly, true);
  });
});
