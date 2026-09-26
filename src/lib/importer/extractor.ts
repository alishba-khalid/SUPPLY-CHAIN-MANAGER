import type {
  RawParsedSheet,
  SheetMapping,
  CanonicalFieldId,
  ExtractionPreview,
  ExtractedWarehouse,
  ExtractedSupplier,
  ExtractedProduct,
  ExtractedInventory,
  ExtractedPurchaseOrder,
  ExtractedTransaction,
  RejectedRowRecord,
  FuzzyMergeGroup,
  SkuSupplierConflict,
  SkuDuplicateResolution,
  ProductDetailConflict,
  DuplicateStockPosition,
  BlockedRecords,
} from "./types";
import { cleanString, cleanNumericValue, cleanDateValue, detectColumnDateFormat } from "./cleaner";
import { buildEntityMergeGroups, normalizeEntityForMatching, type MergeCandidate } from "./deduplicator";

export interface ExtractionOptions {
  mergeGroups?: FuzzyMergeGroup[];
  skuSupplierResolutions?: Record<string, string>; // sku -> chosen supplier ID
  skuDuplicateResolution?: SkuDuplicateResolution; // "sum" | "last"
  /** `${sku}|${field}` -> index of the chosen option in ProductDetailConflict.options */
  productConflictResolutions?: Record<string, number>;
  dateAmbiguityPreference?: "DD/MM" | "MM/DD";
}

const DEFAULT_WAREHOUSE_CODE = "WH-DEFAULT";
const UNASSIGNED_SUP_ID = "SUP-UNASSIGNED";

// A sheet with any of these columns is a purchase-order / transaction sheet
// and must have all the required ones (received date may be blank: open PO).
const PO_FIELDS: CanonicalFieldId[] = ["po_number", "po_quantity", "po_unit_price", "order_date", "expected_date", "received_date"];
const PO_REQUIRED: CanonicalFieldId[] = ["po_number", "po_quantity", "po_unit_price", "order_date", "expected_date"];
const TX_FIELDS: CanonicalFieldId[] = ["transaction_qty", "transaction_direction", "transaction_date"];

/** A supplier or warehouse as written on a row: by ID / code when present, else by name. */
type EntityRef = { id: string } | { name: string };

interface Candidate<T> {
  value: T;
  sheetName: string;
  rowNumber: number;
}

/**
 * Per-SKU product details collected across every row that mentions the SKU,
 * split into [product rows, PO / transaction rows]. Values are only ever
 * added, never overwritten: the final value is chosen at the end, and two
 * rows with different details become a ProductDetailConflict instead of a
 * silent overwrite.
 */
interface ProductAccumulator {
  sku: string;
  names: [Candidate<string>[], Candidate<string>[]];
  categories: [Candidate<string>[], Candidate<string>[]];
  costs: [Candidate<number>[], Candidate<number>[]];
  suppliers: [
    { ref: EntityRef; sheetName: string; rowNumber: number }[],
    { ref: EntityRef; sheetName: string; rowNumber: number }[],
  ];
}

function addDistinct<T>(list: Candidate<T>[], c: Candidate<T>) {
  if (!list.some((x) => x.value === c.value)) list.push(c);
}

/**
 * Extracts all six entities in strict dependency order from parsed workbook sheets and mappings.
 *
 * Identity rules (a file of ID-only purchase orders used to have every
 * supplier fuzzy-merged into one, and product rows were overwritten by every
 * later row mentioning the same SKU):
 * - A supplier / warehouse with an ID or code is identified by that ID alone;
 *   different IDs are never merged.
 * - Name-only variants merge automatically only when clearly the same (case,
 *   punctuation, legal suffix) and are still listed for review; similar names
 *   are suggestions the user must tick.
 * - Product details come from the first row that has them and are never
 *   overwritten; differing details are reported as conflicts.
 */
export function extractEntitiesFromWorkbook(
  sheets: RawParsedSheet[],
  mappings: SheetMapping[],
  options: ExtractionOptions = {}
): ExtractionPreview {
  const mappingMap = new Map(mappings.map((m) => [m.sheetName, m]));

  const suppliersById = new Map<string, { id: string; name?: string; leadTime?: number; email?: string; rowCount: number }>();
  const suppliersByName = new Map<string, { name: string; leadTime?: number; email?: string; rowCount: number }>();
  const warehousesById = new Map<string, { code: string; name?: string; capacity?: number; rowCount: number }>();
  const warehousesByName = new Map<string, { name: string; capacity?: number; rowCount: number }>();

  const products = new Map<string, ProductAccumulator>();
  const rawInventoryList: { sku: string; warehouse: EntityRef; quantity: number }[] = [];
  const rawPurchaseOrdersList: {
    poNumber?: string;
    sku: string;
    supplier: EntityRef | null;
    quantity?: number;
    unitPrice?: number;
    orderDate?: Date | null;
    expectedDate?: Date | null;
    receivedDate?: Date | null;
  }[] = [];
  const rawTransactionsList: { sku: string; warehouse: EntityRef; quantity: number; direction: "IN" | "OUT"; date: Date }[] = [];

  const rejectedRows: RejectedRowRecord[] = [];
  const blockedRecords: BlockedRecords[] = [];

  let defaultWarehouseNeeded = false;
  let totalRowsProcessed = 0;

  // 1. Traverse all sheets and extract raw entity values
  for (const sheet of sheets) {
    const sheetMapping = mappingMap.get(sheet.name);
    if (!sheetMapping) continue;

    // Build field-to-col-index lookup
    const colToField = new Map<number, CanonicalFieldId>();
    for (const m of sheetMapping.mappings) {
      if (m.canonicalField) {
        colToField.set(m.rawHeaderIndex, m.canonicalField);
      }
    }

    const hasWarehouseCol = Array.from(colToField.values()).some((f) => f === "warehouse_code" || f === "warehouse_name");
    const hasInventoryCol = Array.from(colToField.values()).some((f) => f === "quantity_on_hand");

    if (hasInventoryCol && !hasWarehouseCol) {
      defaultWarehouseNeeded = true;
    }

    // A sheet with purchase-order / transaction columns must have every column
    // those records need. Nothing is ever borrowed or defaulted (no stock as
    // PO quantity, no "today" as a date): the records are blocked instead and
    // the preview asks the user to map a column or skip them.
    const mappedFields = new Set(colToField.values());
    const missingPoColumns = PO_FIELDS.some((f) => mappedFields.has(f)) ? PO_REQUIRED.filter((f) => !mappedFields.has(f)) : [];
    const missingTxColumns = TX_FIELDS.some((f) => mappedFields.has(f)) ? TX_FIELDS.filter((f) => !mappedFields.has(f)) : [];
    let blockedPoRows = 0;
    let blockedTxRows = 0;

    // Collect all date values in sheet for global date format detection
    const dateValues: unknown[] = [];
    for (const [colIdx, fieldId] of colToField.entries()) {
      if (fieldId === "order_date" || fieldId === "expected_date" || fieldId === "received_date" || fieldId === "transaction_date") {
        for (const row of sheet.rawRows) {
          dateValues.push(row[colIdx]);
        }
      }
    }
    const detectedDateFormat = detectColumnDateFormat(dateValues);
    const datePreference = options.dateAmbiguityPreference || (detectedDateFormat === "MM/DD" ? "MM/DD" : "DD/MM");

    for (let rIdx = 0; rIdx < sheet.rawRows.length; rIdx++) {
      totalRowsProcessed++;
      const row = sheet.rawRows[rIdx];
      const rowObj: Record<string, unknown> = {};

      for (let cIdx = 0; cIdx < sheet.headers.length; cIdx++) {
        const header = sheet.headers[cIdx];
        rowObj[header] = row[cIdx];
      }

      // Extract field values
      let sku: string | null = null;
      let productName: string | null = null;
      let category: string | null = null;
      let unitCost: number | null = null;
      let supplierName: string | null = null;
      let supplierId: string | null = null;
      let leadTime: number | null = null;
      let supplierEmail: string | null = null;
      let warehouseCode: string | null = null;
      let warehouseName: string | null = null;
      let warehouseCapacity: number | null = null;
      let quantityOnHand: number | null = null;
      let qtyFoundInRow = false;

      let poNumber: string | null = null;
      let orderDate: Date | null = null;
      let expectedDate: Date | null = null;
      let receivedDate: Date | null = null;
      let poQty: number | null = null;
      let poPrice: number | null = null;

      let transQty: number | null = null;
      let transDirection: "IN" | "OUT" | null = null;
      let transDate: Date | null = null;

      // Which cells were filled in, and with what — so "blank" and "invalid"
      // can be told apart in row-level messages.
      const rawByField = new Map<CanonicalFieldId, unknown>();

      for (const [colIdx, fieldId] of colToField.entries()) {
        const rawVal = row[colIdx];
        if (rawVal === null || rawVal === undefined || String(rawVal).trim() === "") continue;
        rawByField.set(fieldId, rawVal);

        switch (fieldId) {
          case "sku":
            sku = cleanString(rawVal);
            break;
          case "product_name":
            productName = cleanString(rawVal);
            break;
          case "category":
            category = cleanString(rawVal);
            break;
          case "unit_cost":
            unitCost = cleanNumericValue(rawVal);
            break;
          case "supplier_name":
            supplierName = cleanString(rawVal);
            break;
          case "supplier_id":
            supplierId = cleanString(rawVal);
            break;
          case "supplier_lead_time":
            leadTime = cleanNumericValue(rawVal);
            break;
          case "supplier_email":
            supplierEmail = cleanString(rawVal);
            break;
          case "warehouse_code":
            warehouseCode = cleanString(rawVal);
            break;
          case "warehouse_name":
            warehouseName = cleanString(rawVal);
            break;
          case "warehouse_capacity":
            warehouseCapacity = cleanNumericValue(rawVal);
            break;
          case "quantity_on_hand":
            qtyFoundInRow = true;
            quantityOnHand = cleanNumericValue(rawVal);
            break;
          case "po_number":
            poNumber = cleanString(rawVal);
            break;
          case "order_date":
            orderDate = cleanDateValue(rawVal, datePreference);
            break;
          case "expected_date":
            expectedDate = cleanDateValue(rawVal, datePreference);
            break;
          case "received_date":
            receivedDate = cleanDateValue(rawVal, datePreference);
            break;
          case "po_quantity":
            poQty = cleanNumericValue(rawVal);
            break;
          case "po_unit_price":
            poPrice = cleanNumericValue(rawVal);
            break;
          case "transaction_qty":
            transQty = cleanNumericValue(rawVal);
            break;
          case "transaction_direction": {
            const d = cleanString(rawVal).toUpperCase();
            transDirection = d === "IN" || d === "INBOUND" ? "IN" : d === "OUT" || d === "OUTBOUND" ? "OUT" : null;
            break;
          }
          case "transaction_date":
            transDate = cleanDateValue(rawVal, datePreference);
            break;
        }
      }

      const rowNumber = rIdx + sheet.headerRowIndex + 2;

      // ---- Validate first; a row with any problem is rejected whole and
      //      nothing from it is written. No value is ever invented. ----
      const problems = new Set<string>();
      const problem = (column: string, reason: string) => problems.add(`column "${column}": ${reason}`);
      const has = (f: CanonicalFieldId) => rawByField.has(f);
      const shown = (f: CanonicalFieldId) => JSON.stringify(String(rawByField.get(f)));

      // Purchase order on this row? (If the sheet lacks a required PO column,
      // the PO part is blocked for the whole sheet and reported separately.)
      const poIntent = PO_FIELDS.some(has);
      if (poIntent && missingPoColumns.length > 0) blockedPoRows++;
      const isPoRow = poIntent && missingPoColumns.length === 0;
      if (isPoRow) {
        if (!poNumber) problem("po_number", "is empty — every purchase order needs its own PO number (none is generated)");
        if (!sku) problem("sku", "is empty — required to know what was ordered");
        if (!has("po_quantity")) problem("po_quantity", "is empty — required (stock on hand is never used instead)");
        else if (poQty === null || poQty <= 0 || !Number.isInteger(poQty)) problem("po_quantity", `${shown("po_quantity")} is not a positive whole number`);
        if (!has("po_unit_price")) problem("po_unit_price", "is empty — required (the product cost is never used instead)");
        else if (poPrice === null || poPrice < 0) problem("po_unit_price", `${shown("po_unit_price")} is not a valid price`);
        if (!has("order_date")) problem("order_date", "is empty, required for lead-time tracking");
        else if (!orderDate) problem("order_date", `${shown("order_date")} is not a valid date`);
        if (!has("expected_date")) problem("expected_date", "is empty, required for supplier OTIF");
        else if (!expectedDate) problem("expected_date", `${shown("expected_date")} is not a valid date`);
        if (has("received_date") && !receivedDate) {
          problem("received_date", `${shown("received_date")} is not a valid date (leave it blank for an open PO)`);
        }
      }

      // Stock movement on this row?
      const txIntent = TX_FIELDS.some(has);
      if (txIntent && missingTxColumns.length > 0) blockedTxRows++;
      const isTxRow = txIntent && missingTxColumns.length === 0;
      if (isTxRow) {
        if (!sku) problem("sku", "is empty — required to know what moved");
        if (!has("transaction_qty")) problem("transaction_qty", "is empty — required for demand history");
        else if (transQty === null || transQty <= 0) problem("transaction_qty", `${shown("transaction_qty")} is not a positive quantity`);
        if (!has("transaction_direction")) problem("transaction_direction", "is empty — must be IN or OUT");
        else if (!transDirection) problem("transaction_direction", `${shown("transaction_direction")} must be IN or OUT`);
        if (!has("transaction_date")) problem("transaction_date", "is empty, required for demand history");
        else if (!transDate) problem("transaction_date", `${shown("transaction_date")} is not a valid date`);
      }

      // A product needs its own SKU — none is generated.
      if (!sku && productName) problem("sku", "is empty — every product needs its own SKU (none is generated)");

      // A stock row needs a real quantity: unknown stock is not zero stock.
      const stockIntent = hasInventoryCol && Boolean(sku) && !isTxRow && Boolean(warehouseCode || warehouseName || !hasWarehouseCol);
      if (stockIntent && (!qtyFoundInRow || quantityOnHand === null)) {
        problem(
          "quantity_on_hand",
          has("quantity_on_hand") ? `${shown("quantity_on_hand")} is not a number — unknown stock is not zero stock` : "is empty — unknown stock is not zero stock"
        );
      }

      if (problems.size > 0) {
        rejectedRows.push({ sheetName: sheet.name, rowIndex: rowNumber, rawRow: rowObj, reason: `Row ${rowNumber}, ${[...problems].join("; ")}` });
        continue;
      }

      const tier = isPoRow || isTxRow ? 1 : 0; // index into the [product rows, PO/transaction rows] lists

      // 1. Warehouse — identified by code when the row has one.
      let warehouseRef: EntityRef | null = null;
      if (warehouseCode) {
        const w = warehousesById.get(warehouseCode) ?? { code: warehouseCode, rowCount: 0 };
        w.rowCount++;
        if (warehouseName && !w.name) w.name = warehouseName;
        if (warehouseCapacity && !w.capacity) w.capacity = warehouseCapacity;
        warehousesById.set(warehouseCode, w);
        warehouseRef = { id: warehouseCode };
      } else if (warehouseName) {
        const w = warehousesByName.get(warehouseName) ?? { name: warehouseName, rowCount: 0 };
        w.rowCount++;
        if (warehouseCapacity && !w.capacity) w.capacity = warehouseCapacity;
        warehousesByName.set(warehouseName, w);
        warehouseRef = { name: warehouseName };
      }

      // 2. Supplier — identified by Supplier ID when the row has one.
      let supplierRef: EntityRef | null = null;
      if (supplierId) {
        const s = suppliersById.get(supplierId) ?? { id: supplierId, rowCount: 0 };
        s.rowCount++;
        if (supplierName && !s.name) s.name = supplierName;
        if (leadTime && leadTime > 0 && !s.leadTime) s.leadTime = leadTime;
        if (supplierEmail && !s.email) s.email = supplierEmail;
        suppliersById.set(supplierId, s);
        supplierRef = { id: supplierId };
      } else if (supplierName) {
        const s = suppliersByName.get(supplierName) ?? { name: supplierName, rowCount: 0 };
        s.rowCount++;
        if (leadTime && leadTime > 0 && !s.leadTime) s.leadTime = leadTime;
        if (supplierEmail && !s.email) s.email = supplierEmail;
        suppliersByName.set(supplierName, s);
        supplierRef = { name: supplierName };
      }

      if (sku) {
        const finalSku = sku;

        // 3. Product details: add, never overwrite.
        const acc: ProductAccumulator = products.get(finalSku) ?? {
          sku: finalSku,
          names: [[], []],
          categories: [[], []],
          costs: [[], []],
          suppliers: [[], []],
        };
        const at = { sheetName: sheet.name, rowNumber };
        if (productName) addDistinct(acc.names[tier], { value: productName, ...at });
        if (category) addDistinct(acc.categories[tier], { value: category, ...at });
        if (unitCost !== null && unitCost >= 0) addDistinct(acc.costs[tier], { value: unitCost, ...at });
        if (supplierRef) {
          const key = JSON.stringify(supplierRef);
          if (!acc.suppliers[tier].some((x) => JSON.stringify(x.ref) === key)) acc.suppliers[tier].push({ ref: supplierRef, ...at });
        }
        products.set(finalSku, acc);

        // 4. Stock position (a blank / invalid quantity was rejected above).
        //    PO / transaction / catalog rows of an all-in-one file simply have
        //    no quantity and add no stock.
        if (hasInventoryCol && qtyFoundInRow && quantityOnHand !== null) {
          rawInventoryList.push({ sku: finalSku, warehouse: warehouseRef ?? { id: DEFAULT_WAREHOUSE_CODE }, quantity: quantityOnHand });
        }

        // 5. Purchase order — every field validated above, nothing defaulted.
        if (isPoRow) {
          rawPurchaseOrdersList.push({
            poNumber: poNumber!,
            sku: finalSku,
            supplier: supplierRef,
            quantity: poQty!,
            unitPrice: poPrice!,
            orderDate: orderDate!,
            expectedDate: expectedDate!,
            receivedDate,
          });
        }

        // 6. Transaction
        if (isTxRow) {
          rawTransactionsList.push({
            sku: finalSku,
            warehouse: warehouseRef ?? { id: DEFAULT_WAREHOUSE_CODE },
            quantity: transQty!,
            direction: transDirection!,
            date: transDate!,
          });
        }
      } else if (hasInventoryCol && !warehouseRef && !supplierRef) {
        // Nothing usable on the row at all. Warehouse-only and supplier-only
        // rows of an all-in-one file are valid and are not rejected.
        rejectedRows.push({
          sheetName: sheet.name,
          rowIndex: rowNumber,
          rawRow: rowObj,
          reason: `Row ${rowNumber}, column "sku": is empty and the row has nothing else to import.`,
        });
      }
    }

    if (blockedPoRows > 0) {
      blockedRecords.push({ sheetName: sheet.name, entity: "purchase_order", missingColumns: missingPoColumns, rows: blockedPoRows });
    }
    if (blockedTxRows > 0) {
      blockedRecords.push({ sheetName: sheet.name, entity: "transaction", missingColumns: missingTxColumns, rows: blockedTxRows });
    }
  }

  const activeMergeGroups = options.mergeGroups;

  // ---------------------------------------------------------------------------
  // Warehouses
  // ---------------------------------------------------------------------------
  const warehouseCandidates: MergeCandidate[] = [
    ...[...warehousesById.values()].map((w) => ({ originalName: w.name || w.code, rowCount: w.rowCount, entityId: w.code })),
    ...[...warehousesByName.values()].map((w) => ({ originalName: w.name, rowCount: w.rowCount })),
  ];
  const warehouseGroups = buildEntityMergeGroups(warehouseCandidates, "warehouse");
  const warehouseResolver = entityResolver(
    warehouseCandidates,
    (activeMergeGroups ?? warehouseGroups).filter((g) => g.entityType === "warehouse")
  );

  const finalWarehouses: ExtractedWarehouse[] = [];
  const warehouseCodeByName = new Map<string, string>(); // canonical name-only warehouse -> generated code
  let missingCapacityCount = 0;
  for (const w of warehousesById.values()) {
    // Only a code on stock / transaction rows: create it if missing, never
    // rename an existing warehouse to its code.
    const referenceOnly = !w.name && !w.capacity;
    finalWarehouses.push({
      code: w.code,
      name: w.name || w.code,
      capacityUnits: w.capacity || null,
      ...(referenceOnly ? { referenceOnly } : {}),
    });
    // Counted even when only named on stock rows: if it's new, it is created
    // with capacity unknown, and the preview says so.
    if (!w.capacity) missingCapacityCount++;
  }
  const usedWarehouseCodes = new Set(finalWarehouses.map((w) => w.code));
  let whSeq = 1;
  const nextWarehouseCode = () => {
    let code: string;
    do code = `WH-${String(whSeq++).padStart(2, "0")}`;
    while (usedWarehouseCodes.has(code));
    usedWarehouseCodes.add(code);
    return code;
  };
  for (const w of warehousesByName.values()) {
    const target = warehouseResolver(w.name);
    if (target.id || warehouseCodeByName.has(target.name)) continue; // merged into another warehouse
    const code = nextWarehouseCode();
    warehouseCodeByName.set(target.name, code);
    const capacity = warehousesByName.get(target.name)?.capacity || w.capacity || null;
    finalWarehouses.push({ code, name: target.name, capacityUnits: capacity, isAutoGeneratedCode: true });
    if (!capacity) missingCapacityCount++;
  }
  const resolveWarehouse = (ref: EntityRef): string => {
    if ("id" in ref) return ref.id;
    const target = warehouseResolver(ref.name);
    return target.id ?? warehouseCodeByName.get(target.name) ?? DEFAULT_WAREHOUSE_CODE;
  };

  // ---------------------------------------------------------------------------
  // Suppliers
  // ---------------------------------------------------------------------------
  const supplierCandidates: MergeCandidate[] = [
    ...[...suppliersById.values()].map((s) => ({ originalName: s.name || s.id, rowCount: s.rowCount, entityId: s.id })),
    ...[...suppliersByName.values()].map((s) => ({ originalName: s.name, rowCount: s.rowCount })),
  ];
  const supplierGroups = buildEntityMergeGroups(supplierCandidates, "supplier");
  const supplierResolver = entityResolver(
    supplierCandidates,
    (activeMergeGroups ?? supplierGroups).filter((g) => g.entityType === "supplier")
  );

  const finalSuppliers: ExtractedSupplier[] = [];
  const supplierIdByName = new Map<string, string>(); // canonical name-only supplier -> generated ID
  let missingLeadTimeCount = 0;
  const contactEmail = (name: string, email?: string) =>
    email || `contact@${normalizeEntityForMatching(name).replace(/\s+/g, "").slice(0, 15) || "supplier"}.com`;
  for (const s of suppliersById.values()) {
    const name = s.name || s.id;
    // Only an ID on product / PO rows: create it if missing, never overwrite
    // an existing supplier's name, lead time or email with placeholders.
    const referenceOnly = !s.name && !s.leadTime && !s.email;
    finalSuppliers.push({
      supplierId: s.id,
      name,
      leadTimeDays: s.leadTime || 14,
      email: contactEmail(name, s.email),
      leadTimeMissing: !s.leadTime,
      ...(referenceOnly ? { referenceOnly } : {}),
    });
    if (!s.leadTime && !referenceOnly) missingLeadTimeCount++;
  }
  const usedSupplierIds = new Set(finalSuppliers.map((s) => s.supplierId));
  let supSeq = 1;
  const nextSupplierId = () => {
    let id: string;
    do id = `SUP-${String(supSeq++).padStart(3, "0")}`;
    while (usedSupplierIds.has(id));
    usedSupplierIds.add(id);
    return id;
  };
  for (const s of suppliersByName.values()) {
    const target = supplierResolver(s.name);
    if (target.id || supplierIdByName.has(target.name)) continue; // merged into another supplier
    const canonical = suppliersByName.get(target.name) ?? s;
    const id = nextSupplierId();
    supplierIdByName.set(target.name, id);
    finalSuppliers.push({
      supplierId: id,
      name: target.name,
      leadTimeDays: canonical.leadTime || 14,
      email: contactEmail(target.name, canonical.email),
      isAutoGeneratedId: true,
      leadTimeMissing: !canonical.leadTime,
    });
    if (!canonical.leadTime) missingLeadTimeCount++;
  }
  const resolveSupplier = (ref: EntityRef | null): string => {
    if (!ref) return UNASSIGNED_SUP_ID;
    if ("id" in ref) return ref.id;
    const target = supplierResolver(ref.name);
    return target.id ?? supplierIdByName.get(target.name) ?? UNASSIGNED_SUP_ID;
  };
  const supplierLabel = (id: string) => {
    const s = finalSuppliers.find((x) => x.supplierId === id);
    return s ? (s.name === id ? id : `${s.name} (${id})`) : id;
  };

  // ---------------------------------------------------------------------------
  // Products — choose, never overwrite
  // ---------------------------------------------------------------------------
  const productConflicts: ProductDetailConflict[] = [];
  const skuConflicts: SkuSupplierConflict[] = [];
  const choose = <T extends string | number>(
    sku: string,
    field: ProductDetailConflict["field"],
    tiers: [Candidate<T>[], Candidate<T>[]]
  ): T | undefined => {
    const candidates = tiers[0].length > 0 ? tiers[0] : tiers[1]; // product rows win over PO / transaction rows
    if (candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0].value;
    const chosen = options.productConflictResolutions?.[`${sku}|${field}`];
    const selectedIndex = chosen !== undefined && chosen >= 0 && chosen < candidates.length ? chosen : 0;
    productConflicts.push({ sku, field, options: candidates.map((o) => ({ ...o })), selectedIndex });
    return candidates[selectedIndex].value;
  };

  const finalProducts: ExtractedProduct[] = [];
  for (const acc of products.values()) {
    const name = choose(acc.sku, "name", acc.names) ?? acc.sku;
    const category = choose(acc.sku, "category", acc.categories) ?? "General";
    // Never defaulted: null means the file has no cost for this SKU (an
    // existing product keeps its cost; a new one is refused at commit).
    const unitCost = choose(acc.sku, "unitCost", acc.costs) ?? null;

    const supplierRows = acc.suppliers[0].length > 0 ? acc.suppliers[0] : acc.suppliers[1];
    const supplierIds = [...new Set(supplierRows.map((s) => resolveSupplier(s.ref)))];
    let supplierId = supplierIds[0] ?? UNASSIGNED_SUP_ID;
    if (supplierIds.length > 1) {
      const chosen = options.skuSupplierResolutions?.[acc.sku];
      supplierId = chosen && supplierIds.includes(chosen) ? chosen : supplierIds[0];
      skuConflicts.push({
        sku: acc.sku,
        productName: name,
        suppliers: supplierIds,
        selectedSupplier: supplierId,
        supplierLabels: Object.fromEntries(supplierIds.map((id) => [id, supplierLabel(id)])),
      });
    }
    // No product row and no name anywhere — the SKU is only mentioned on
    // stock / PO / transaction rows. Create it if missing (with the best
    // guesses above), never overwrite an existing product with them.
    const referenceOnly =
      acc.names[0].length + acc.names[1].length + acc.categories[0].length + acc.categories[1].length === 0 &&
      acc.costs[0].length === 0 &&
      acc.suppliers[0].length === 0;
    finalProducts.push({
      sku: acc.sku,
      name,
      category,
      unitCost,
      supplierId,
      supplierName: supplierLabel(supplierId),
      ...(referenceOnly ? { referenceOnly } : {}),
    });
  }

  // ---------------------------------------------------------------------------
  // Stock positions — duplicates are reported; the user picks sum or keep-last
  // ---------------------------------------------------------------------------
  const resolution = options.skuDuplicateResolution || "sum";
  const inventoryByKey = new Map<string, { item: ExtractedInventory; quantities: number[] }>();
  for (const row of rawInventoryList) {
    const warehouseCode = resolveWarehouse(row.warehouse);
    const key = `${row.sku}::${warehouseCode}`;
    const existing = inventoryByKey.get(key);
    if (existing) {
      existing.quantities.push(row.quantity);
      existing.item.quantityOnHand = resolution === "sum" ? existing.item.quantityOnHand + row.quantity : row.quantity;
    } else {
      inventoryByKey.set(key, { item: { sku: row.sku, warehouseCode, quantityOnHand: row.quantity }, quantities: [row.quantity] });
    }
  }
  const finalInventory = [...inventoryByKey.values()].map((v) => v.item);
  const duplicateStockPositions: DuplicateStockPosition[] = [...inventoryByKey.values()]
    .filter((v) => v.quantities.length > 1)
    .map((v) => ({ sku: v.item.sku, warehouseCode: v.item.warehouseCode, quantities: v.quantities }));

  // ---------------------------------------------------------------------------
  // Purchase orders & transactions
  // ---------------------------------------------------------------------------
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  // Every field below was validated per row; nothing is defaulted here.
  const finalPOs: ExtractedPurchaseOrder[] = rawPurchaseOrdersList.map((po) => ({
    poNumber: po.poNumber!,
    supplierId: resolveSupplier(po.supplier),
    sku: po.sku,
    quantity: po.quantity!,
    unitPrice: po.unitPrice!,
    orderDate: iso(po.orderDate!),
    expectedDate: iso(po.expectedDate!),
    receivedDate: po.receivedDate ? iso(po.receivedDate) : null,
  }));

  const finalTransactions: ExtractedTransaction[] = rawTransactionsList.map((t) => ({
    sku: t.sku,
    warehouseCode: resolveWarehouse(t.warehouse),
    quantity: t.quantity,
    direction: t.direction,
    date: iso(t.date),
  }));

  // Placeholder warehouse / supplier only when something actually points at them.
  const needsDefaultWarehouse =
    defaultWarehouseNeeded ||
    finalInventory.some((i) => i.warehouseCode === DEFAULT_WAREHOUSE_CODE) ||
    finalTransactions.some((t) => t.warehouseCode === DEFAULT_WAREHOUSE_CODE);
  if (needsDefaultWarehouse && !finalWarehouses.some((w) => w.code === DEFAULT_WAREHOUSE_CODE)) {
    finalWarehouses.push({ code: DEFAULT_WAREHOUSE_CODE, name: "Primary Facility (Default)", capacityUnits: null, isAutoGeneratedCode: true });
    missingCapacityCount++;
  }
  const needsUnassigned =
    finalProducts.some((p) => p.supplierId === UNASSIGNED_SUP_ID) || finalPOs.some((po) => po.supplierId === UNASSIGNED_SUP_ID);
  if (needsUnassigned && !finalSuppliers.some((s) => s.supplierId === UNASSIGNED_SUP_ID)) {
    finalSuppliers.push({
      supplierId: UNASSIGNED_SUP_ID,
      name: "Unassigned Supplier",
      leadTimeDays: 14,
      email: "unassigned@company.internal",
      isAutoGeneratedId: true,
      leadTimeMissing: true,
      // A placeholder: only inserted if a new product / PO actually needs it.
      referenceOnly: true,
    });
  }

  const generatedIdsCount =
    finalWarehouses.filter((w) => w.isAutoGeneratedCode).length + finalSuppliers.filter((s) => s.isAutoGeneratedId).length;

  return {
    warehouses: finalWarehouses,
    suppliers: finalSuppliers,
    products: finalProducts,
    inventory: finalInventory,
    purchaseOrders: finalPOs,
    transactions: finalTransactions,
    mergeGroups: activeMergeGroups ?? [...supplierGroups, ...warehouseGroups],
    skuConflicts,
    productConflicts,
    duplicateStockPositions,
    blockedRecords,
    rejectedRows,
    missingLeadTimeCount,
    missingCapacityCount,
    defaultWarehouseUsed: needsDefaultWarehouse,
    generatedIdsCount,
    totalRowsProcessed,
  };
}

/**
 * Resolves a name to its entity after the confirmed merges: returns the ID
 * (Supplier ID / warehouse code) when the name belongs to — or was merged
 * into — an ID-bearing entity, otherwise the canonical name-only entity.
 * Unconfirmed (suggested) groups are never applied.
 */
function entityResolver(candidates: MergeCandidate[], groups: FuzzyMergeGroup[]) {
  const idByName = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const c of candidates) {
    if (!c.entityId) continue;
    if (idByName.has(c.originalName) && idByName.get(c.originalName) !== c.entityId) ambiguous.add(c.originalName);
    else idByName.set(c.originalName, c.entityId);
  }
  const alias = new Map<string, string>();
  for (const g of groups) {
    if (!g.isConfirmed) continue;
    for (const v of g.variants) if (v.originalName !== g.canonicalName) alias.set(v.originalName, g.canonicalName);
  }
  return (name: string): { id?: string; name: string } => {
    let current = name;
    for (let hops = 0; hops < 5 && alias.has(current); hops++) current = alias.get(current)!;
    const id = !ambiguous.has(current) ? idByName.get(current) : undefined;
    return id ? { id, name: current } : { name: current };
  };
}
