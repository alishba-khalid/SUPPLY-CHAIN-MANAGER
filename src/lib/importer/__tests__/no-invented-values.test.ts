/**
 * No invented values: a blank or invalid PO quantity, unit price, date, PO
 * number, stock quantity, transaction date or product cost rejects the row
 * ("Row N, column X: reason") — it never becomes 100, 0, today, today + 14,
 * a generated PO number, or a value borrowed from another column.
 * Covers both the smart importer (extractor) and the 6-file template mode.
 */
import { test, describe } from "node:test";
import assert from "node:assert";
import { readWorkbookBuffer } from "../reader";
import { generateSheetColumnMappings } from "../mapping";
import { extractEntitiesFromWorkbook } from "../extractor";
import { parseTemplateRows } from "../template-rows";

function extractCsv(csv: string) {
  const sheets = readWorkbookBuffer(Buffer.from(csv));
  const mappings = sheets.map((s) => ({ sheetName: s.name, headerRowIndex: s.headerRowIndex, mappings: generateSheetColumnMappings(s.headers, s.rawRows) }));
  return extractEntitiesFromWorkbook(sheets, mappings);
}
const PO_HEAD = "PO Number,Supplier ID,SKU,PO Quantity,Unit Price,Order Date,Expected Date,Received Date";
const reasonFor = (p: ReturnType<typeof extractCsv>, row: number) => p.rejectedRows.find((r) => r.rowIndex === row)?.reason ?? "";

describe("smart importer", () => {
  test("blank PO quantity rejects the row", () => {
    const p = extractCsv([PO_HEAD, "PO-1,SUP-1,SKU-1,10,2.5,2026-07-01,2026-07-10,", "PO-2,SUP-1,SKU-1,,2.5,2026-07-01,2026-07-10,"].join("\n"));
    assert.deepStrictEqual(p.purchaseOrders.map((x) => x.poNumber), ["PO-1"]);
    assert.match(reasonFor(p, 3), /^Row 3, column "po_quantity": is empty/);
  });

  test("missing expected date rejects the row (required for supplier OTIF)", () => {
    const p = extractCsv([PO_HEAD, "PO-1,SUP-1,SKU-1,10,2.5,2026-07-01,,"].join("\n"));
    assert.strictEqual(p.purchaseOrders.length, 0);
    assert.match(reasonFor(p, 2), /column "expected_date": is empty, required for supplier OTIF/);
  });

  test("missing PO number rejects the row (none is generated)", () => {
    const p = extractCsv([PO_HEAD, ",SUP-1,SKU-1,10,2.5,2026-07-01,2026-07-10,"].join("\n"));
    assert.strictEqual(p.purchaseOrders.length, 0);
    assert.match(reasonFor(p, 2), /column "po_number": is empty/);
  });

  test("blank received date is accepted as an open PO", () => {
    const p = extractCsv([PO_HEAD, "PO-1,SUP-1,SKU-1,10,2.5,2026-07-01,2026-07-10,"].join("\n"));
    assert.strictEqual(p.rejectedRows.length, 0);
    assert.strictEqual(p.purchaseOrders[0].receivedDate, null);
  });

  test("stock is never used as PO quantity: no PO quantity column blocks the POs, stock still imports", () => {
    const p = extractCsv(
      ["SKU,Warehouse Code,Quantity On Hand,PO Number,Unit Price,Order Date,Expected Date", "SKU-1,NDC,2500,PO-9,4,2026-07-01,2026-07-10"].join("\n")
    );
    assert.strictEqual(p.purchaseOrders.length, 0, "no PO built from the stock quantity");
    assert.deepStrictEqual(p.blockedRecords, [{ sheetName: "Sheet1", entity: "purchase_order", missingColumns: ["po_quantity"], rows: 1 }]);
    assert.strictEqual(p.inventory[0].quantityOnHand, 2500, "the stock row itself still imports");
  });

  test("invalid dates and blank unit price are rejected; nothing is dated today", () => {
    const p = extractCsv(
      [PO_HEAD, "PO-1,SUP-1,SKU-1,10,,2026-07-01,2026-07-10,", "PO-2,SUP-1,SKU-1,10,2.5,not a date,2026-07-10,", "PO-3,SUP-1,SKU-1,10,2.5,2026-07-01,2026-07-10,someday"].join("\n")
    );
    assert.strictEqual(p.purchaseOrders.length, 0);
    assert.match(reasonFor(p, 2), /column "po_unit_price": is empty/);
    assert.match(reasonFor(p, 3), /column "order_date": "not a date" is not a valid date/);
    assert.match(reasonFor(p, 4), /column "received_date": "someday" is not a valid date/);
  });

  test("transactions with a blank date or bad direction are rejected, never dated today", () => {
    const p = extractCsv(["SKU,Warehouse Code,Transaction Quantity,Direction,Transaction Date", "SKU-1,NDC,5,OUT,2026-07-01", "SKU-1,NDC,5,OUT,", "SKU-1,NDC,5,SIDEWAYS,2026-07-01"].join("\n"));
    assert.strictEqual(p.transactions.length, 1);
    assert.match(reasonFor(p, 3), /column "transaction_date": is empty/);
    assert.match(reasonFor(p, 4), /column "transaction_direction": "SIDEWAYS" must be IN or OUT/);
  });

  test("a product without a cost keeps cost null (never 0), and a row without SKU is rejected (none generated)", () => {
    const p = extractCsv(["SKU,Product Name,Supplier ID", "SKU-1,Valve,SUP-1", ",Nameless Widget,SUP-1"].join("\n"));
    assert.strictEqual(p.products.find((x) => x.sku === "SKU-1")?.unitCost, null);
    assert.ok(!p.products.some((x) => x.sku.startsWith("SKU-AUTO")), "no SKU is generated");
    assert.match(reasonFor(p, 3), /column "sku": is empty/);
  });
});

describe("template mode (6-file importer)", () => {
  const po = (over: Record<string, string>) => ({
    "PO Number": "PO-1",
    "Supplier ID": "SUP-1",
    SKU: "SKU-1",
    Quantity: "10",
    "Unit Price": "2.5",
    "Order Date": "2026-07-01",
    "Expected Date": "2026-07-10",
    "Received Date": "",
    ...over,
  });

  test("blank PO quantity is rejected with its file row number (never 0)", () => {
    const { records, rejected } = parseTemplateRows("purchase_orders", [po({}), po({ "PO Number": "PO-2", Quantity: "" })]);
    assert.strictEqual(records.length, 1);
    assert.deepStrictEqual(rejected, [{ row: 3, reason: 'Row 3, column "quantity": is empty — required (never set to 0)' }]);
  });

  test("missing expected date and invalid order date are rejected (never today)", () => {
    const { records, rejected } = parseTemplateRows("purchase_orders", [po({ "Expected Date": "" }), po({ "PO Number": "PO-2", "Order Date": "31/31/2026" })]);
    assert.strictEqual(records.length, 0);
    assert.match(rejected[0].reason, /^Row 2, column "expected_date": is empty, required for supplier OTIF/);
    assert.match(rejected[1].reason, /^Row 3, column "order_date": "31\/31\/2026" is not a valid date/);
  });

  test("missing PO number is rejected", () => {
    const { rejected } = parseTemplateRows("purchase_orders", [po({ "PO Number": "" })]);
    assert.match(rejected[0].reason, /column "po_number": is empty/);
  });

  test("blank received date is accepted as an open PO", () => {
    const { records, rejected } = parseTemplateRows("purchase_orders", [po({})]);
    assert.strictEqual(rejected.length, 0);
    assert.strictEqual(records[0].record.receivedDate, null);
  });

  test("blank stock quantity, blank product cost and a transaction without a date are rejected", () => {
    const inv = parseTemplateRows("inventory", [{ SKU: "SKU-1", "Warehouse Code": "NDC", "Quantity On Hand": "" }]);
    assert.match(inv.rejected[0].reason, /column "quantity_on_hand": is empty — unknown stock is not zero stock/);
    const prod = parseTemplateRows("products", [{ SKU: "SKU-1", Name: "Valve", Category: "x", "Unit Cost": "", "Supplier ID": "SUP-1" }]);
    assert.match(prod.rejected[0].reason, /column "unit_cost": is empty — required \(never set to 0\)/);
    const tx = parseTemplateRows("transactions", [{ SKU: "SKU-1", "Warehouse Code": "NDC", Quantity: "5", Direction: "OUT", Date: "" }]);
    assert.match(tx.rejected[0].reason, /column "date": is empty, required for demand history/);
    assert.strictEqual(inv.records.length + prod.records.length + tx.records.length, 0);
  });

  test("row numbers follow the file across batches", () => {
    const { rejected } = parseTemplateRows("purchase_orders", [po({ Quantity: "" })], 502);
    assert.strictEqual(rejected[0].row, 502);
    assert.match(rejected[0].reason, /^Row 502,/);
  });
});
