/**
 * Template importer: repeat-import keys and result messages (pure, no database).
 *   npx tsx --test src/lib/importer/__tests__/template-import-results.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert";
import {
  IMPORT_KEY_FIELD,
  addTallies,
  readImportKey,
  sameDay,
  sameMoney,
  tallyChanges,
  templateResultMessage,
  templateStoppedMessage,
  withTemplateImportKeys,
  EMPTY_TALLY,
} from "../template-import";

const tx = (sku: string, qty: number, dir = "OUT", date = "2026-08-14") => ({
  SKU: sku,
  "Warehouse Code": "NDC",
  Quantity: qty,
  Direction: dir,
  Date: date,
});
const keysOf = (rows: Record<string, unknown>[]) => rows.map((r) => r[IMPORT_KEY_FIELD]);

describe("transaction import keys", () => {
  test("use the same format as Smart Import", () => {
    const [row] = withTemplateImportKeys([tx("SKU-1001", 500, "IN")]);
    assert.strictEqual(row[IMPORT_KEY_FIELD], "SKU-1001|NDC|2026-08-14|IN|500#1");
  });

  test("two identical movements in one file get different keys, so both are saved", () => {
    assert.deepStrictEqual(keysOf(withTemplateImportKeys([tx("A", 5), tx("A", 5), tx("B", 5)])), [
      "A|NDC|2026-08-14|OUT|5#1",
      "A|NDC|2026-08-14|OUT|5#2",
      "B|NDC|2026-08-14|OUT|5#1",
    ]);
  });

  test("are numbered over the whole file, not per 500-row batch", () => {
    const keys = keysOf(withTemplateImportKeys(Array.from({ length: 1200 }, () => tx("A", 1))));
    assert.strictEqual(new Set(keys).size, 1200);
    assert.strictEqual(keys[500], "A|NDC|2026-08-14|OUT|1#501");
  });

  test("importing the same file again gives the same keys, so every row is skipped", () => {
    const file = [tx("A", 5), tx("A", 5), tx("B", 7, "IN", "2026-08-15")];
    const saved = new Set(keysOf(withTemplateImportKeys(file)));
    const again = keysOf(withTemplateImportKeys(file));
    assert.strictEqual(again.filter((k) => saved.has(k as string)).length, file.length);
  });

  test("a rejected row gets no key, and other rows keep their numbering", () => {
    const rows = withTemplateImportKeys([tx("A", 5), { ...tx("A", 5), Quantity: "" }, tx("A", 5)]);
    assert.deepStrictEqual(keysOf(rows), ["A|NDC|2026-08-14|OUT|5#1", undefined, "A|NDC|2026-08-14|OUT|5#2"]);
  });

  test("other columns are passed through untouched", () => {
    const [row] = withTemplateImportKeys([{ ...tx("A", 5), Note: "x" }]);
    assert.strictEqual(row.Note, "x");
    assert.strictEqual(row.SKU, "A");
  });

  test("the server only accepts a plausible key", () => {
    assert.strictEqual(readImportKey({ [IMPORT_KEY_FIELD]: "A|NDC|2026-08-14|OUT|5#1" }), "A|NDC|2026-08-14|OUT|5#1");
    assert.strictEqual(readImportKey({}), null);
    assert.strictEqual(readImportKey({ [IMPORT_KEY_FIELD]: 12 }), null);
    assert.strictEqual(readImportKey({ [IMPORT_KEY_FIELD]: "" }), null);
    assert.strictEqual(readImportKey({ [IMPORT_KEY_FIELD]: "x".repeat(501) }), null);
  });
});

describe("added / updated / unchanged", () => {
  type Row = { id: string; name: string };
  const same = (a: Row, b: Row) => a.name === b.name;

  test("compares each record with what is saved", () => {
    const saved = new Map([
      ["P1", { id: "P1", name: "Valve" }],
      ["P2", { id: "P2", name: "Gasket" }],
    ]);
    const t = tallyChanges(
      [
        { id: "P1", name: "Valve" },
        { id: "P2", name: "Gasket v2" },
        { id: "P3", name: "Bolt" },
      ],
      (r) => r.id,
      saved,
      same
    );
    assert.deepStrictEqual(t, { added: 1, updated: 1, unchanged: 1, skipped: 0 });
  });

  test("a key repeated within the file is compared with its earlier row", () => {
    const t = tallyChanges(
      [
        { id: "P9", name: "Bolt" },
        { id: "P9", name: "Bolt" },
      ],
      (r) => r.id,
      new Map(),
      same
    );
    assert.deepStrictEqual(t, { added: 1, updated: 0, unchanged: 1, skipped: 0 });
  });

  test("money and dates compare the way the database stores them", () => {
    assert.ok(sameMoney("45.50", 45.5));
    assert.ok(!sameMoney(45.5, 45.51));
    assert.ok(sameDay(new Date("2026-08-14T00:00:00Z"), new Date("2026-08-14T00:00:00.000Z")));
    assert.ok(sameDay(null, null));
    assert.ok(!sameDay(null, new Date("2026-08-14")));
  });

  test("batch tallies add up", () => {
    assert.deepStrictEqual(addTallies({ added: 1, updated: 2, unchanged: 3, skipped: 4 }, { added: 10, skipped: 1 }), {
      added: 11,
      updated: 2,
      unchanged: 3,
      skipped: 5,
    });
  });
});

describe("result messages", () => {
  test("transactions: some new, some already imported", () => {
    assert.strictEqual(
      templateResultMessage("transactions", { ...EMPTY_TALLY, added: 1200, skipped: 20386 }, 0),
      "Saved 1,200 new transactions. 20,386 were already imported earlier and were skipped, not added twice."
    );
  });

  test("transactions: the whole file was already imported", () => {
    assert.strictEqual(
      templateResultMessage("transactions", { ...EMPTY_TALLY, skipped: 21586 }, 0),
      "Nothing new: all 21,586 transactions in this file were already imported, so nothing was added."
    );
  });

  test("transactions: all new", () => {
    assert.strictEqual(templateResultMessage("transactions", { ...EMPTY_TALLY, added: 1 }, 0), "Saved 1 new transaction.");
  });

  test("other types: added, updated, unchanged", () => {
    assert.strictEqual(
      templateResultMessage("products", { added: 12, updated: 30, unchanged: 458, skipped: 0 }, 0),
      "Products: 12 added, 30 updated, 458 unchanged."
    );
  });

  test("other types: nothing changed", () => {
    assert.strictEqual(
      templateResultMessage("products", { ...EMPTY_TALLY, unchanged: 500 }, 0),
      "No changes: all 500 products in this file already match what's saved."
    );
    assert.strictEqual(
      templateResultMessage("inventory", { ...EMPTY_TALLY, unchanged: 3 }, 0),
      "No changes: all 3 stock balances in this file already match what's saved."
    );
  });

  test("rejected rows are still reported", () => {
    assert.strictEqual(
      templateResultMessage("suppliers", { added: 2, updated: 0, unchanged: 0, skipped: 0 }, 1),
      "Suppliers: 2 added, 0 updated, 0 unchanged. 1 row was rejected (see below)."
    );
  });

  test("stopped partway says which rows were already saved", () => {
    assert.strictEqual(
      templateStoppedMessage("Product SKU 'SKU-9' does not exist. Please import Products before Transactions.", 1002, 1501),
      "Stopped in rows 1,002–1,501: Product SKU 'SKU-9' does not exist. Please import Products before Transactions. Rows 2–1,001 were saved. Importing this file again won't add them twice."
    );
  });

  test("failing in the first batch shows the error alone (nothing was saved)", () => {
    assert.strictEqual(templateStoppedMessage("Supplier missing.", 2, 501), "Supplier missing.");
  });
});
