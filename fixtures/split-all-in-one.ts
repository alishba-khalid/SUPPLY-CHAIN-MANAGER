/**
 * Splits an all-in-one "Record Type" CSV (WAREHOUSE / SUPPLIER / PRODUCT /
 * INVENTORY / PURCHASE_ORDER / TRANSACTION rows) into the six template CSVs
 * the app offers for download (same headers as src/components/domain/
 * data-importer.tsx). Used by the importer tests to check that the same data
 * gives the same result whether it arrives as one file or six.
 */
export const TEMPLATE_FILES = [
  "warehouses.csv",
  "suppliers.csv",
  "products.csv",
  "inventory.csv",
  "purchase_orders.csv",
  "transactions.csv",
] as const;

export function splitAllInOneIntoTemplates(allInOneCsv: string): Record<(typeof TEMPLATE_FILES)[number], string> {
  const lines = allInOneCsv.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const rows = lines.slice(1).map((l) => {
    const cells = l.split(",");
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])) as Record<string, string>;
  });
  const of = (type: string) => rows.filter((r) => r["Record Type"] === type);
  const csv = (head: string[], body: string[][]) => [head.join(","), ...body.map((r) => r.join(","))].join("\n");

  return {
    "warehouses.csv": csv(
      ["Warehouse Code", "Name", "Capacity (Units)"],
      of("WAREHOUSE").map((r) => [r["Warehouse Code"], r["Warehouse Name"], r["Capacity (Units)"]])
    ),
    "suppliers.csv": csv(
      ["Supplier ID", "Name", "Lead Time (Days)", "Email"],
      of("SUPPLIER").map((r) => [r["Supplier ID"], r["Supplier Name"], r["Lead Time (Days)"], r["Email"]])
    ),
    "products.csv": csv(
      ["SKU", "Name", "Category", "Unit Cost", "Supplier ID"],
      of("PRODUCT").map((r) => [r.SKU, r["Product Name"], r.Category, r["Unit Cost"], r["Supplier ID"]])
    ),
    "inventory.csv": csv(
      ["SKU", "Warehouse Code", "Quantity On Hand"],
      of("INVENTORY").map((r) => [r.SKU, r["Warehouse Code"], r["Quantity On Hand"]])
    ),
    "purchase_orders.csv": csv(
      ["PO Number", "Supplier ID", "SKU", "Quantity", "Unit Price", "Order Date", "Expected Date", "Received Date"],
      of("PURCHASE_ORDER").map((r) => [
        r["PO Number"],
        r["Supplier ID"],
        r.SKU,
        r["PO Quantity"],
        r["Unit Price"],
        r["Order Date"],
        r["Expected Date"],
        r["Received Date"],
      ])
    ),
    "transactions.csv": csv(
      ["SKU", "Warehouse Code", "Quantity", "Direction", "Date"],
      of("TRANSACTION").map((r) => [r.SKU, r["Warehouse Code"], r["Transaction Quantity"], r.Direction, r["Transaction Date"]])
    ),
  };
}
