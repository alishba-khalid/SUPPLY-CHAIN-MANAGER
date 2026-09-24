import type { CanonicalFieldDef, CanonicalFieldId, ColumnMappingItem, SheetMapping } from "./types";
import { cleanString } from "./cleaner";

export const CANONICAL_FIELDS: CanonicalFieldDef[] = [
  // Product
  { id: "sku", label: "Product SKU / Item Code", category: "product", description: "Unique catalog product identifier", requiredForEntity: true },
  { id: "product_name", label: "Product Name / Description", category: "product", description: "Item description or title", requiredForEntity: true },
  { id: "category", label: "Category", category: "product", description: "Product grouping or classification" },
  { id: "unit_cost", label: "Unit Cost / Purchase Rate", category: "product", description: "Base purchase cost per unit" },

  // Supplier
  { id: "supplier_name", label: "Supplier / Party Name", category: "supplier", description: "Vendor or company name", requiredForEntity: true },
  { id: "supplier_id", label: "Supplier ID / Vendor Code", category: "supplier", description: "Vendor identifier" },
  { id: "supplier_lead_time", label: "Supplier Lead Time (Days)", category: "supplier", description: "Standard fulfillment lead time in days" },
  { id: "supplier_email", label: "Supplier Contact Email", category: "supplier", description: "PO dispatch email address" },

  // Warehouse
  { id: "warehouse_code", label: "Warehouse Code / Location", category: "warehouse", description: "Facility code or godown identifier", requiredForEntity: true },
  { id: "warehouse_name", label: "Warehouse Name", category: "warehouse", description: "Full facility description" },
  { id: "warehouse_capacity", label: "Warehouse Capacity (Units)", category: "warehouse", description: "Maximum storage capacity" },

  // Inventory
  { id: "quantity_on_hand", label: "Quantity On Hand / Stock Balance", category: "inventory", description: "Current closing stock count", requiredForEntity: true },

  // Purchase Orders
  { id: "po_number", label: "Purchase Order Number (PO #)", category: "purchase_order", description: "Order reference code" },
  { id: "order_date", label: "Order Date", category: "purchase_order", description: "Date PO was placed" },
  { id: "expected_date", label: "Expected Delivery Date (ETA)", category: "purchase_order", description: "Contractual delivery date" },
  { id: "received_date", label: "Received Date (GRN)", category: "purchase_order", description: "Actual receipt date (blank if open)" },
  { id: "po_quantity", label: "PO Ordered Quantity", category: "purchase_order", description: "Units on purchase order" },
  { id: "po_unit_price", label: "PO Unit Price", category: "purchase_order", description: "Purchase price on order" },

  // Transactions
  { id: "transaction_qty", label: "Transaction Movement Quantity", category: "transaction", description: "Units moved" },
  { id: "transaction_direction", label: "Movement Direction (IN / OUT)", category: "transaction", description: "Inbound receipt or outbound issue" },
  { id: "transaction_date", label: "Transaction Posting Date", category: "transaction", description: "Date movement occurred" },
];

/**
 * Rich synonym dictionary including South Asian commercial terms.
 */
export const SYNONYM_DICTIONARY: Record<CanonicalFieldId, string[]> = {
  sku: [
    "sku", "item code", "product code", "item #", "item no", "part no", "part number",
    "article", "article no", "material code", "material #", "code", "barcode", "upc", "item_code", "product_sku"
  ],
  product_name: [
    "product name", "product", "description", "item name", "particulars", "item description",
    "material description", "details", "title", "item", "product description", "item_name"
  ],
  category: [
    "category", "type", "group", "class", "department", "product category", "item group", "item type", "family", "sector"
  ],
  unit_cost: [
    "unit cost", "unit price", "rate", "cost", "price", "purchase price", "buying rate",
    "unit rate", "cost price", "purchase rate", "unit_cost", "unit_price", "rate/unit"
  ],
  supplier_name: [
    "supplier name", "supplier", "vendor name", "vendor", "party name", "party",
    "seller", "manufacturer", "mfr", "distributor", "source", "company name", "vendor_name", "supplier_name"
  ],
  supplier_id: [
    "supplier id", "supplier code", "vendor id", "vendor code", "party code", "supplier #", "vendor #", "vendor code"
  ],
  supplier_lead_time: [
    "lead time", "lead days", "delivery days", "tat", "turnaround time", "replenishment time",
    "lead_days", "leadtime", "delivery time", "standard delivery days", "lead time (days)"
  ],
  supplier_email: [
    "supplier email", "email", "vendor email", "contact email", "email address", "mail", "contact_email"
  ],
  warehouse_code: [
    "warehouse code", "warehouse", "location", "store", "branch", "godown", "site",
    "facility", "wh", "wh code", "whse", "godown name", "location code", "warehouse_code"
  ],
  warehouse_name: [
    "warehouse name", "location name", "store name", "godown name", "site name", "facility name"
  ],
  warehouse_capacity: [
    "warehouse capacity", "capacity", "capacity units", "max capacity", "storage limit", "capacity (units)"
  ],
  quantity_on_hand: [
    "quantity on hand", "qty on hand", "quantity", "qty", "on hand", "on_hand",
    "stock", "balance", "closing stock", "current stock", "stock on hand", "available units", "units", "quantity (units)", "closing_stock"
  ],
  po_number: [
    "po number", "po #", "po", "purchase order", "po no", "order #", "order no", "doc no", "document number", "po_number"
  ],
  order_date: [
    "order date", "po date", "purchase date", "doc date", "date of order", "order_date"
  ],
  expected_date: [
    "expected date", "expected delivery", "eta", "due date", "promised date", "delivery date", "expected", "expected_date"
  ],
  received_date: [
    "received date", "grn date", "grn", "actual delivery", "delivery received", "arrival date", "received_date"
  ],
  po_quantity: [
    "po quantity", "ordered quantity", "order qty", "po qty"
  ],
  po_unit_price: [
    "po unit price", "po rate", "po price", "order rate"
  ],
  transaction_qty: [
    "transaction quantity", "movement qty", "moved units", "trans qty"
  ],
  transaction_direction: [
    "direction", "in out", "movement type", "trans type", "movement", "in/out", "trans_type"
  ],
  transaction_date: [
    "transaction date", "trans date", "movement date", "posting date", "entry date"
  ],
};

/**
 * Computes Levenshtein edit distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = new Array<number[]>(an + 1);
  for (let i = 0; i <= an; ++i) {
    const row = (matrix[i] = new Array<number>(bn + 1));
    row[0] = i;
  }
  for (let i = 1; i <= bn; ++i) {
    matrix[0][i] = i;
  }
  for (let i = 1; i <= an; ++i) {
    for (let j = 1; j <= bn; ++j) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[an][bn];
}

/**
 * Normalizes header string for synonym matching.
 */
export function normalizeHeaderString(h: string): string {
  return h
    .toLowerCase()
    .replace(/[#_.\-()/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Maps a single raw header string to the best matching canonical field.
 */
export function matchHeaderToCanonical(rawHeader: string): {
  field: CanonicalFieldId | null;
  confidence: number;
  reason: string;
} {
  const norm = normalizeHeaderString(rawHeader);
  if (!norm) {
    return { field: null, confidence: 0, reason: "Empty header" };
  }

  // 1. Exact Synonym Match (Score = 1.0)
  for (const fieldId of Object.keys(SYNONYM_DICTIONARY) as CanonicalFieldId[]) {
    const synonyms = SYNONYM_DICTIONARY[fieldId];
    for (const syn of synonyms) {
      const normSyn = normalizeHeaderString(syn);
      if (norm === normSyn) {
        return {
          field: fieldId,
          confidence: 1.0,
          reason: `Exact synonym match ("${syn}")`,
        };
      }
    }
  }

  // 2. Token Overlap & Substring Match
  let bestField: CanonicalFieldId | null = null;
  let highestScore = 0;
  let bestReason = "";

  const headerTokens = norm.split(" ").filter(Boolean);

  for (const fieldId of Object.keys(SYNONYM_DICTIONARY) as CanonicalFieldId[]) {
    const synonyms = SYNONYM_DICTIONARY[fieldId];
    for (const syn of synonyms) {
      const normSyn = normalizeHeaderString(syn);
      const synTokens = normSyn.split(" ").filter(Boolean);

      // Check token containment
      const sharedTokens = headerTokens.filter((t) => synTokens.includes(t));
      if (sharedTokens.length > 0) {
        const jaccard = sharedTokens.length / (headerTokens.length + synTokens.length - sharedTokens.length);
        if (jaccard > highestScore) {
          highestScore = jaccard;
          bestField = fieldId;
          bestReason = `Token overlap with "${syn}" (${Math.round(jaccard * 100)}%)`;
        }
      }

      // Check Levenshtein ratio
      const maxLen = Math.max(norm.length, normSyn.length);
      const dist = levenshtein(norm, normSyn);
      const ratio = 1 - dist / maxLen;
      if (ratio > 0.75 && ratio > highestScore) {
        highestScore = ratio;
        bestField = fieldId;
        bestReason = `Fuzzy string similarity with "${syn}" (${Math.round(ratio * 100)}%)`;
      }
    }
  }

  if (highestScore >= 0.60 && bestField) {
    return {
      field: bestField,
      confidence: Math.round(highestScore * 100) / 100,
      reason: bestReason,
    };
  }

  return { field: null, confidence: 0, reason: "No high-confidence match found" };
}

/**
 * Generates initial column mappings for all headers of a sheet.
 */
export function generateSheetColumnMappings(
  headers: string[],
  sampleRows: (string | number | boolean | Date | null)[][]
): ColumnMappingItem[] {
  return resolveGenericHeadersFromContext(mapHeadersIndividually(headers, sampleRows));
}

const GENERIC_NAME = new Set(["name", "description", "title"]);
const GENERIC_QUANTITY = new Set(["quantity", "qty", "units"]);
const GENERIC_DATE = new Set(["date"]);
const GENERIC_PRICE = new Set(["unit price", "price", "unitprice"]);

/**
 * Generic headers ("Name", "Quantity", "Date", "Unit Price") mean different
 * things in different files: "Name" next to a Warehouse Code is the warehouse
 * name, "Quantity" in a sheet with PO numbers is the ordered quantity, not
 * stock on hand. Matched in isolation they were ignored or mapped to the
 * wrong field — silently, because both count as "confident" and the mapping
 * step is auto-skipped. Resolve them from the other columns in the sheet.
 */
function resolveGenericHeadersFromContext(items: ColumnMappingItem[]): ColumnMappingItem[] {
  const present = new Set(items.map((i) => i.canonicalField).filter(Boolean) as CanonicalFieldId[]);
  const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const resolved = (item: ColumnMappingItem, field: CanonicalFieldId, context: string): ColumnMappingItem => {
    present.add(field);
    return { ...item, canonicalField: field, confidence: 0.95, matchReason: `Resolved from sheet context (${context})` };
  };

  return items.map((item) => {
    const h = norm(item.rawHeader);
    if (GENERIC_NAME.has(h)) {
      if (present.has("sku") && !present.has("product_name")) return resolved(item, "product_name", "sheet has SKU");
      if (present.has("supplier_id") && !present.has("supplier_name")) return resolved(item, "supplier_name", "sheet has Supplier ID");
      if (present.has("warehouse_code") && !present.has("warehouse_name")) return resolved(item, "warehouse_name", "sheet has Warehouse Code");
    }
    if (GENERIC_QUANTITY.has(h)) {
      if (present.has("po_number") && !present.has("po_quantity")) return resolved(item, "po_quantity", "sheet has PO Number");
      if (present.has("transaction_direction") && !present.has("transaction_qty")) return resolved(item, "transaction_qty", "sheet has Direction");
    }
    if (GENERIC_DATE.has(h)) {
      if (present.has("transaction_direction") && !present.has("transaction_date")) return resolved(item, "transaction_date", "sheet has Direction");
    }
    if (GENERIC_PRICE.has(h) && present.has("po_number") && !present.has("po_unit_price")) {
      return resolved(item, "po_unit_price", "sheet has PO Number");
    }
    return item;
  });
}

function mapHeadersIndividually(
  headers: string[],
  sampleRows: (string | number | boolean | Date | null)[][]
): ColumnMappingItem[] {
  const mappedFieldsSoFar = new Set<CanonicalFieldId>();

  return headers.map((rawHeader, idx) => {
    const samples = sampleRows.slice(0, 3).map((r) => {
      const v = r[idx];
      return v !== null && v !== undefined ? String(v) : null;
    });

    const match = matchHeaderToCanonical(rawHeader);

    // Prevent duplicate assignment of unique fields (like sku, po_number) if lower confidence
    let field = match.field;
    if (field && mappedFieldsSoFar.has(field)) {
      // If already mapped with high confidence, skip
      if (match.confidence < 0.90) {
        field = null;
      }
    }

    if (field) {
      mappedFieldsSoFar.add(field);
    }

    return {
      rawHeader,
      rawHeaderIndex: idx,
      canonicalField: field,
      confidence: match.confidence,
      matchReason: match.reason,
      sampleValues: samples,
    };
  });
}

/**
 * Computes a deterministic SHA-like signature from sheet headers for database mapping persistence.
 */
export function computeHeadersSignature(headers: string[]): string {
  const sorted = [...headers].map(normalizeHeaderString).sort().join("|");
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sig_${Math.abs(hash).toString(16)}`;
}
