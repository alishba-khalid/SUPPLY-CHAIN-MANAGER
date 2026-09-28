/**
 * Template importer file checks: wrong file type in a slot, non-spreadsheets,
 * missing columns (pure, no database).
 *   npx tsx --test src/lib/importer/__tests__/template-import-messages.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert";
import {
  TEMPLATE_REQUIRED_HEADERS,
  UNREADABLE_FILE_MESSAGE,
  checkFileExtension,
  checkTemplateHeaders,
  detectTemplateType,
} from "../template-file-check";
import type { TemplateType } from "../template-rows";

/** The header row of each downloadable template. */
const TEMPLATE_HEADERS: Record<TemplateType, string[]> = {
  warehouses: ["Warehouse Code", "Name", "Capacity (Units)"],
  suppliers: ["Supplier ID", "Name", "Lead Time (Days)", "Email"],
  products: ["SKU", "Name", "Category", "Unit Cost", "Supplier ID"],
  inventory: ["SKU", "Warehouse Code", "Quantity On Hand"],
  purchase_orders: ["PO Number", "Supplier ID", "SKU", "Quantity", "Unit Price", "Order Date", "Expected Date", "Received Date"],
  transactions: ["SKU", "Warehouse Code", "Quantity", "Direction", "Date"],
};
const TYPES = Object.keys(TEMPLATE_HEADERS) as TemplateType[];
const SECTION = { mode: "section", templateButton: "Template CSV" } as const;
const TEMPLATE_MODE = { mode: "template-mode", templateButton: "Download Template" } as const;

describe("each template file is recognised", () => {
  for (const type of TYPES) {
    test(`${type} file in the ${type} slot is accepted`, () => {
      assert.strictEqual(detectTemplateType(TEMPLATE_HEADERS[type])?.type, type);
      assert.strictEqual(checkTemplateHeaders(type, TEMPLATE_HEADERS[type], SECTION), null);
    });
  }

  test("header spelling and spacing don't matter", () => {
    assert.strictEqual(checkTemplateHeaders("products", ["sku", " name ", "supplier_id"], SECTION), null);
  });
});

describe("a file in the wrong slot is refused, naming what it is", () => {
  for (const file of TYPES) {
    for (const slot of TYPES) {
      if (file === slot) continue;
      test(`${file} file in the ${slot} slot`, () => {
        const msg = checkTemplateHeaders(slot, TEMPLATE_HEADERS[file], SECTION);
        assert.ok(msg, "must be refused");
        assert.match(msg!, /^This looks like a /);
      });
    }
  }

  test("a Products file in the Suppliers slot (previously accepted, renaming suppliers)", () => {
    assert.strictEqual(
      checkTemplateHeaders("suppliers", TEMPLATE_HEADERS.products, SECTION),
      "This looks like a Products file (it has SKU and Name columns), not a Suppliers file. Use Import Products on the Inventory page to upload it, or choose a Suppliers file here."
    );
  });

  test("a Transactions file in the Products slot", () => {
    assert.strictEqual(
      checkTemplateHeaders("products", TEMPLATE_HEADERS.transactions, SECTION),
      "This looks like a Transactions file (it has Direction and Date columns), not a Products file. Use Import Transactions on the Inventory page to upload it, or choose a Products file here."
    );
  });

  test("6-File Template Mode points to the type picker instead", () => {
    assert.strictEqual(
      checkTemplateHeaders("products", TEMPLATE_HEADERS.transactions, TEMPLATE_MODE),
      "This looks like a Transactions file (it has Direction and Date columns), not a Products file. Choose Transactions above to upload it, or choose a Products file here."
    );
  });

  test("any file with a SKU column is refused by the Suppliers and Warehouses slots", () => {
    assert.strictEqual(
      checkTemplateHeaders("suppliers", ["Supplier ID", "SKU", "Supplier Name"], SECTION),
      "This file has a SKU column, so it isn't a Suppliers file (one row per supplier). Choose a Suppliers file here."
    );
    assert.match(checkTemplateHeaders("warehouses", ["Warehouse Code", "SKU"], SECTION)!, /isn't a Warehouses file/);
  });
});

describe("missing columns", () => {
  test("names the missing columns and the template button", () => {
    assert.strictEqual(
      checkTemplateHeaders("products", ["SKU", "Description"], SECTION),
      'Missing required columns: Name, Supplier ID. Download the template with the "Template CSV" button to see the layout we expect.'
    );
    assert.match(checkTemplateHeaders("warehouses", ["Location"], TEMPLATE_MODE)!, /"Download Template" button/);
  });

  test("required columns match what each slot's parser needs", () => {
    for (const type of TYPES) {
      for (const h of TEMPLATE_REQUIRED_HEADERS[type]) assert.ok(TEMPLATE_HEADERS[type].includes(h), `${type}: ${h}`);
    }
  });
});

describe("not a spreadsheet", () => {
  test("a PDF is named as a PDF, not reported as missing columns", () => {
    assert.strictEqual(checkFileExtension("invoice.pdf"), "This is a .pdf file. Upload a CSV or Excel file (.csv, .xlsx or .xls).");
    assert.strictEqual(checkFileExtension("photo.PNG"), "This is a .png file. Upload a CSV or Excel file (.csv, .xlsx or .xls).");
  });

  test("a file with no type", () => {
    assert.strictEqual(checkFileExtension("stock"), "This file has no file type. Upload a CSV or Excel file (.csv, .xlsx or .xls).");
  });

  test("spreadsheets pass", () => {
    for (const name of ["a.csv", "b.xlsx", "c.XLS", "my.stock.file.csv"]) assert.strictEqual(checkFileExtension(name), null);
  });

  test("an unreadable file gets plain directions", () => {
    assert.strictEqual(
      UNREADABLE_FILE_MESSAGE,
      "We couldn't read this file. It may be damaged or not a real spreadsheet. Open it in Excel, save it as .xlsx or .csv, and try again."
    );
  });
});
