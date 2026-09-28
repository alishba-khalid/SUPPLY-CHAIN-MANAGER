/**
 * File checks for the 6-file template importer (the per-section "Import …"
 * buttons and 6-File Template Mode), run in the browser before anything is
 * sent: is it a spreadsheet, can it be read, is it the wrong kind of file for
 * this slot, and are required columns missing. Pure, so both importers and
 * the tests share one set of rules and messages.
 */
import type { TemplateType } from "./template-rows";

export const TEMPLATE_REQUIRED_HEADERS: Record<TemplateType, string[]> = {
  warehouses: ["Warehouse Code", "Name"],
  suppliers: ["Supplier ID", "Name"],
  products: ["SKU", "Name", "Supplier ID"],
  inventory: ["SKU", "Warehouse Code", "Quantity On Hand"],
  purchase_orders: ["PO Number", "Supplier ID", "SKU", "Quantity", "Unit Price", "Order Date", "Expected Date"],
  transactions: ["SKU", "Warehouse Code", "Quantity", "Direction", "Date"],
};

const FILE_NAMES: Record<TemplateType, string> = {
  warehouses: "Warehouses",
  suppliers: "Suppliers",
  products: "Products",
  inventory: "Inventory Balances",
  purchase_orders: "Purchase Orders",
  transactions: "Transactions",
};

/** Where each file type is uploaded from a page's import buttons. */
const SECTION_IMPORT_PLACE: Record<TemplateType, string> = {
  warehouses: "Import on the Warehouses page",
  suppliers: "Import on the Suppliers page",
  products: "Import Products on the Inventory page",
  inventory: "Import Balances on the Inventory page",
  purchase_orders: "Import POs on the Procurement page",
  transactions: "Import Transactions on the Inventory page",
};

/** Columns that identify each file type, and how the message describes them. */
const SIGNATURES: { type: TemplateType; has: string[]; lacks?: string[]; evidence: string }[] = [
  { type: "transactions", has: ["Direction", "Date"], evidence: "Direction and Date columns" },
  { type: "purchase_orders", has: ["PO Number"], evidence: "a PO Number column" },
  { type: "inventory", has: ["Quantity On Hand"], evidence: "a Quantity On Hand column" },
  { type: "products", has: ["SKU", "Name"], evidence: "SKU and Name columns" },
  { type: "suppliers", has: ["Supplier ID", "Name"], lacks: ["SKU"], evidence: "a Supplier ID column and no SKU column" },
  { type: "warehouses", has: ["Warehouse Code", "Name"], lacks: ["SKU"], evidence: "a Warehouse Code column and no SKU column" },
];

const SPREADSHEET_EXTENSIONS = ["csv", "xlsx", "xls"];

export const UNREADABLE_FILE_MESSAGE =
  "We couldn't read this file. It may be damaged or not a real spreadsheet. Open it in Excel, save it as .xlsx or .csv, and try again.";

const normalize = (s: string) => s.trim().toLowerCase().replace(/[\s_\-()]/g, "");

/** A message if the file name isn't a spreadsheet (a dropped file skips the picker's filter). */
export function checkFileExtension(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
  if (SPREADSHEET_EXTENSIONS.includes(ext)) return null;
  return ext
    ? `This is a .${ext} file. Upload a CSV or Excel file (.csv, .xlsx or .xls).`
    : "This file has no file type. Upload a CSV or Excel file (.csv, .xlsx or .xls).";
}

/** Which template these headers look like, from columns unique to each type. */
export function detectTemplateType(headers: string[]): { type: TemplateType; evidence: string } | null {
  const present = new Set(headers.map((h) => normalize(String(h))));
  const hit = SIGNATURES.find(
    (s) => s.has.every((h) => present.has(normalize(h))) && !(s.lacks ?? []).some((h) => present.has(normalize(h)))
  );
  return hit ? { type: hit.type, evidence: hit.evidence } : null;
}

/**
 * A message if the headers don't fit this slot: the wrong kind of file first
 * (it names what the file looks like and where it goes), then missing columns.
 * `context` picks the directions: a page's import button, or the type picker
 * in 6-File Template Mode.
 */
export function checkTemplateHeaders(
  slot: TemplateType,
  headers: string[],
  context: { mode: "section" | "template-mode"; templateButton: string }
): string | null {
  const present = new Set(headers.map((h) => normalize(String(h))));
  const detected = detectTemplateType(headers);

  if (detected && detected.type !== slot) {
    const where =
      context.mode === "section"
        ? `Use ${SECTION_IMPORT_PLACE[detected.type]} to upload it`
        : `Choose ${FILE_NAMES[detected.type]} above to upload it`;
    return `This looks like a ${FILE_NAMES[detected.type]} file (it has ${detected.evidence}), not a ${FILE_NAMES[slot]} file. ${where}, or choose a ${FILE_NAMES[slot]} file here.`;
  }

  // One row per supplier or warehouse: a SKU column means it's a product-level file.
  if ((slot === "suppliers" || slot === "warehouses") && present.has(normalize("SKU"))) {
    return `This file has a SKU column, so it isn't a ${FILE_NAMES[slot]} file (one row per ${slot === "suppliers" ? "supplier" : "warehouse"}). Choose a ${FILE_NAMES[slot]} file here.`;
  }

  const missing = TEMPLATE_REQUIRED_HEADERS[slot].filter((h) => !present.has(normalize(h)));
  if (missing.length > 0) {
    return `Missing required columns: ${missing.join(", ")}. Download the template with the "${context.templateButton}" button to see the layout we expect.`;
  }
  return null;
}
