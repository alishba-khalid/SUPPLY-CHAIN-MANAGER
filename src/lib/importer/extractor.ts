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
} from "./types";
import { cleanString, cleanNumericValue, cleanDateValue, detectColumnDateFormat } from "./cleaner";
import { clusterFuzzyEntities, normalizeEntityForMatching } from "./deduplicator";

export interface ExtractionOptions {
  mergeGroups?: FuzzyMergeGroup[];
  skuSupplierResolutions?: Record<string, string>; // sku -> chosen supplier
  skuDuplicateResolution?: SkuDuplicateResolution; // "sum" | "last"
  dateAmbiguityPreference?: "DD/MM" | "MM/DD";
}

/**
 * Extracts all six entities in strict dependency order from parsed workbook sheets and mappings.
 */
export function extractEntitiesFromWorkbook(
  sheets: RawParsedSheet[],
  mappings: SheetMapping[],
  options: ExtractionOptions = {}
): ExtractionPreview {
  const mappingMap = new Map(mappings.map((m) => [m.sheetName, m]));

  const rawWarehousesMap = new Map<string, { originalName: string; code?: string; capacity?: number; rowCount: number }>();
  const rawSuppliersMap = new Map<string, { originalName: string; supplierId?: string; leadTime?: number; email?: string; rowCount: number }>();
  const rawProductsMap = new Map<string, { sku: string; name: string; category?: string; unitCost?: number; rawSupplier?: string; rawSupplierId?: string }>();
  const rawInventoryList: { sku: string; rawWarehouse: string; quantity: number | null; rowIndex: number; sheetName: string; fullRow: Record<string, unknown> }[] = [];
  const rawPurchaseOrdersList: { poNumber?: string; sku?: string; rawSupplier?: string; quantity?: number; unitPrice?: number; orderDate?: Date | null; expectedDate?: Date | null; receivedDate?: Date | null }[] = [];
  const rawTransactionsList: { sku?: string; rawWarehouse?: string; quantity?: number; direction?: "IN" | "OUT"; date?: Date | null }[] = [];

  const rejectedRows: RejectedRowRecord[] = [];
  const skuToSuppliersMap = new Map<string, { productName: string; suppliers: Set<string> }>();

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

      for (const [colIdx, fieldId] of colToField.entries()) {
        const rawVal = row[colIdx];
        if (rawVal === null || rawVal === undefined || String(rawVal).trim() === "") continue;

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

      // 1. Warehouse collection
      const finalWh = warehouseCode || warehouseName || (hasInventoryCol && !hasWarehouseCol ? "WH-DEFAULT" : null);
      if (finalWh) {
        const normWh = normalizeEntityForMatching(finalWh);
        const existing = rawWarehousesMap.get(normWh) || { originalName: finalWh, rowCount: 0 };
        existing.rowCount += 1;
        if (warehouseCapacity) existing.capacity = warehouseCapacity;
        if (warehouseCode) existing.code = warehouseCode;
        rawWarehousesMap.set(normWh, existing);
      }

      // 2. Supplier collection
      const finalSupplier = supplierName || supplierId;
      if (finalSupplier) {
        const normSup = normalizeEntityForMatching(finalSupplier);
        const existing = rawSuppliersMap.get(normSup) || { originalName: finalSupplier, rowCount: 0 };
        existing.rowCount += 1;
        if (leadTime && leadTime > 0) existing.leadTime = leadTime;
        if (supplierEmail) existing.email = supplierEmail;
        if (supplierId) existing.supplierId = supplierId;
        rawSuppliersMap.set(normSup, existing);
      }

      // 3. Product collection & validation
      if (sku || productName) {
        const finalSku = sku || `SKU-AUTO-${rawProductsMap.size + 1}`;
        const finalName = productName || finalSku;

        if (finalSupplier) {
          if (!skuToSuppliersMap.has(finalSku)) {
            skuToSuppliersMap.set(finalSku, { productName: finalName, suppliers: new Set() });
          }
          skuToSuppliersMap.get(finalSku)!.suppliers.add(finalSupplier);
        }

        rawProductsMap.set(finalSku, {
          sku: finalSku,
          name: finalName,
          category: category || "General",
          unitCost: unitCost !== null && unitCost >= 0 ? unitCost : 0.0,
          rawSupplier: finalSupplier || undefined,
          rawSupplierId: supplierId || undefined,
        });

        // 4. Inventory balance collection
        if (hasInventoryCol) {
          if (!qtyFoundInRow || quantityOnHand === null) {
            // I5.2: Blank quantity -> land in rejected rows with reason, NOT zero stock
            rejectedRows.push({
              sheetName: sheet.name,
              rowIndex: rIdx + sheet.headerRowIndex + 2,
              rawRow: rowObj,
              reason: "Blank or invalid on-hand quantity. Unknown stock is not zero stock.",
            });
          } else {
            rawInventoryList.push({
              sku: finalSku,
              rawWarehouse: finalWh || "WH-DEFAULT",
              quantity: quantityOnHand,
              rowIndex: rIdx + sheet.headerRowIndex + 2,
              sheetName: sheet.name,
              fullRow: rowObj,
            });
          }
        }

        // 5. Purchase Order collection
        if (poNumber || (orderDate && expectedDate)) {
          rawPurchaseOrdersList.push({
            poNumber: poNumber || `PO-${rawPurchaseOrdersList.length + 8001}`,
            sku: finalSku,
            rawSupplier: finalSupplier || undefined,
            quantity: poQty || quantityOnHand || 100,
            unitPrice: poPrice || unitCost || 0.0,
            orderDate: orderDate || new Date(),
            expectedDate: expectedDate || new Date(Date.now() + 14 * 86400 * 1000),
            receivedDate: receivedDate || null,
          });
        }

        // 6. Transaction collection
        if (transQty !== null && transDirection && transDate) {
          rawTransactionsList.push({
            sku: finalSku,
            rawWarehouse: finalWh || "WH-DEFAULT",
            quantity: transQty,
            direction: transDirection,
            date: transDate,
          });
        }
      } else if (hasInventoryCol && !sku && !productName) {
        // Completely invalid row missing both SKU and Product Name
        rejectedRows.push({
          sheetName: sheet.name,
          rowIndex: rIdx + sheet.headerRowIndex + 2,
          rawRow: rowObj,
          reason: "Row contains no SKU or Product Name.",
        });
      }
    }
  }

  // Deduplicate and cluster suppliers & warehouses
  const supplierClusterCandidates = Array.from(rawSuppliersMap.values()).map((s) => ({
    originalName: s.originalName,
    rowCount: s.rowCount,
  }));
  const warehouseClusterCandidates = Array.from(rawWarehousesMap.values()).map((w) => ({
    originalName: w.originalName,
    rowCount: w.rowCount,
  }));

  const generatedMergeGroups = [
    ...clusterFuzzyEntities(supplierClusterCandidates, "supplier", 0.85),
    ...clusterFuzzyEntities(warehouseClusterCandidates, "warehouse", 0.85),
  ];

  // Merge group lookup
  const activeMergeGroups = options.mergeGroups || generatedMergeGroups;
  const supplierNameAliasMap = new Map<string, string>();
  const warehouseNameAliasMap = new Map<string, string>();

  for (const mg of activeMergeGroups) {
    if (!mg.isConfirmed) continue;
    for (const v of mg.variants) {
      if (mg.entityType === "supplier") {
        supplierNameAliasMap.set(normalizeEntityForMatching(v.originalName), mg.canonicalName);
      } else {
        warehouseNameAliasMap.set(normalizeEntityForMatching(v.originalName), mg.canonicalName);
      }
    }
  }

  // --- ENTITY BUILDER 1: Warehouses ---
  const finalWarehouses: ExtractedWarehouse[] = [];
  const warehouseCodeMap = new Map<string, string>(); // normName -> code
  let whSeq = 1;
  let missingCapacityCount = 0;

  for (const [normName, whData] of rawWarehousesMap.entries()) {
    const canonicalName = warehouseNameAliasMap.get(normName) || whData.originalName;
    const canonNorm = normalizeEntityForMatching(canonicalName);

    if (warehouseCodeMap.has(canonNorm)) {
      warehouseCodeMap.set(normName, warehouseCodeMap.get(canonNorm)!);
      continue;
    }

    let code = whData.code || "";
    let isAutoGeneratedCode = false;
    if (!code) {
      if (canonicalName === "WH-DEFAULT") {
        code = "WH-DEFAULT";
      } else {
        code = `WH-${whSeq.toString().padStart(2, "0")}`;
        isAutoGeneratedCode = true;
        whSeq++;
      }
    }

    const capacity = whData.capacity ?? 0;
    if (capacity === 0) {
      missingCapacityCount++;
    }

    warehouseCodeMap.set(canonNorm, code);
    warehouseCodeMap.set(normName, code);

    finalWarehouses.push({
      code,
      name: canonicalName === "WH-DEFAULT" ? "Primary Facility (Default)" : canonicalName,
      capacityUnits: capacity,
      isAutoGeneratedCode,
    });
  }

  if (finalWarehouses.length === 0 || defaultWarehouseNeeded) {
    if (!finalWarehouses.some((w) => w.code === "WH-DEFAULT")) {
      finalWarehouses.push({
        code: "WH-DEFAULT",
        name: "Primary Facility (Default)",
        capacityUnits: 0,
        isAutoGeneratedCode: true,
      });
      missingCapacityCount++;
    }
  }

  // --- ENTITY BUILDER 2: Suppliers ---
  const finalSuppliers: ExtractedSupplier[] = [];
  const supplierIdMap = new Map<string, string>(); // normName -> supplierId
  let supSeq = 1;
  let missingLeadTimeCount = 0;

  for (const [normName, supData] of rawSuppliersMap.entries()) {
    const canonicalName = supplierNameAliasMap.get(normName) || supData.originalName;
    const canonNorm = normalizeEntityForMatching(canonicalName);

    if (supplierIdMap.has(canonNorm)) {
      supplierIdMap.set(normName, supplierIdMap.get(canonNorm)!);
      continue;
    }

    let supplierId = supData.supplierId || "";
    let isAutoGeneratedId = false;
    if (!supplierId) {
      supplierId = `SUP-${supSeq.toString().padStart(3, "0")}`;
      isAutoGeneratedId = true;
      supSeq++;
    }

    const leadTimeDays = supData.leadTime || 14;
    const leadTimeMissing = !supData.leadTime;
    if (leadTimeMissing) {
      missingLeadTimeCount++;
    }

    const cleanDomain = canonNorm.replace(/\s+/g, "").slice(0, 15);
    const email = supData.email || `contact@${cleanDomain || "supplier"}.com`;

    supplierIdMap.set(canonNorm, supplierId);
    supplierIdMap.set(normName, supplierId);

    finalSuppliers.push({
      supplierId,
      name: canonicalName,
      leadTimeDays,
      email,
      isAutoGeneratedId,
      leadTimeMissing,
    });
  }

  // Ensure Unassigned supplier exists for unlinked products
  const UNASSIGNED_SUP_ID = "SUP-UNASSIGNED";
  if (!finalSuppliers.some((s) => s.supplierId === UNASSIGNED_SUP_ID)) {
    finalSuppliers.push({
      supplierId: UNASSIGNED_SUP_ID,
      name: "Unassigned Supplier",
      leadTimeDays: 14,
      email: "unassigned@company.internal",
      isAutoGeneratedId: true,
      leadTimeMissing: true,
    });
  }

  // Detect SKU Supplier Conflicts (I5.1)
  const skuConflicts: SkuSupplierConflict[] = [];
  for (const [sku, info] of skuToSuppliersMap.entries()) {
    const uniqueSuppliers = Array.from(info.suppliers);
    if (uniqueSuppliers.length > 1) {
      const selected = options.skuSupplierResolutions?.[sku] || uniqueSuppliers[0];
      skuConflicts.push({
        sku,
        productName: info.productName,
        suppliers: uniqueSuppliers,
        selectedSupplier: selected,
      });
    }
  }

  // --- ENTITY BUILDER 3: Products ---
  const finalProducts: ExtractedProduct[] = [];
  for (const p of rawProductsMap.values()) {
    let resolvedSupplierName = p.rawSupplier;
    if (p.sku && options.skuSupplierResolutions?.[p.sku]) {
      resolvedSupplierName = options.skuSupplierResolutions[p.sku];
    }

    let supplierId = UNASSIGNED_SUP_ID;
    if (p.rawSupplierId) {
      supplierId = p.rawSupplierId;
    } else if (resolvedSupplierName) {
      const canonSup = supplierNameAliasMap.get(normalizeEntityForMatching(resolvedSupplierName)) || resolvedSupplierName;
      supplierId = supplierIdMap.get(normalizeEntityForMatching(canonSup)) || UNASSIGNED_SUP_ID;
    }

    finalProducts.push({
      sku: p.sku,
      name: p.name,
      category: p.category || "General",
      unitCost: p.unitCost || 0.0,
      supplierId,
      supplierName: resolvedSupplierName || "Unassigned",
    });
  }

  // --- ENTITY BUILDER 4: Inventory Balances (with SKU deduplication I4 / S4.4) ---
  const inventoryKeyMap = new Map<string, ExtractedInventory>();
  const resolution = options.skuDuplicateResolution || "sum";

  for (const item of rawInventoryList) {
    if (item.quantity === null) continue;

    const normWh = normalizeEntityForMatching(item.rawWarehouse);
    const whCode = warehouseCodeMap.get(normWh) || "WH-DEFAULT";
    const key = `${item.sku}::${whCode}`;

    if (inventoryKeyMap.has(key)) {
      const existing = inventoryKeyMap.get(key)!;
      if (resolution === "sum") {
        existing.quantityOnHand += item.quantity;
      } else {
        existing.quantityOnHand = item.quantity;
      }
    } else {
      inventoryKeyMap.set(key, {
        sku: item.sku,
        warehouseCode: whCode,
        quantityOnHand: item.quantity,
      });
    }
  }

  const finalInventory = Array.from(inventoryKeyMap.values());

  // --- ENTITY BUILDER 5: Purchase Orders ---
  const finalPOs: ExtractedPurchaseOrder[] = [];
  for (const po of rawPurchaseOrdersList) {
    if (!po.sku || !po.poNumber) continue;

    let supId = UNASSIGNED_SUP_ID;
    if (po.rawSupplier) {
      const canonSup = supplierNameAliasMap.get(normalizeEntityForMatching(po.rawSupplier)) || po.rawSupplier;
      supId = supplierIdMap.get(normalizeEntityForMatching(canonSup)) || UNASSIGNED_SUP_ID;
    }

    finalPOs.push({
      poNumber: po.poNumber,
      supplierId: supId,
      sku: po.sku,
      quantity: po.quantity || 100,
      unitPrice: po.unitPrice || 0.0,
      orderDate: po.orderDate ? po.orderDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      expectedDate: po.expectedDate ? po.expectedDate.toISOString().slice(0, 10) : new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10),
      receivedDate: po.receivedDate ? po.receivedDate.toISOString().slice(0, 10) : null,
    });
  }

  // --- ENTITY BUILDER 6: Transactions ---
  const finalTransactions: ExtractedTransaction[] = [];
  for (const t of rawTransactionsList) {
    if (!t.sku || !t.quantity || !t.direction || !t.date) continue;

    const normWh = normalizeEntityForMatching(t.rawWarehouse || "");
    const whCode = warehouseCodeMap.get(normWh) || "WH-DEFAULT";

    finalTransactions.push({
      sku: t.sku,
      warehouseCode: whCode,
      quantity: t.quantity,
      direction: t.direction,
      date: t.date.toISOString().slice(0, 10),
    });
  }

  const generatedIdsCount =
    finalWarehouses.filter((w) => w.isAutoGeneratedCode).length +
    finalSuppliers.filter((s) => s.isAutoGeneratedId).length;

  return {
    warehouses: finalWarehouses,
    suppliers: finalSuppliers,
    products: finalProducts,
    inventory: finalInventory,
    purchaseOrders: finalPOs,
    transactions: finalTransactions,
    mergeGroups: generatedMergeGroups,
    skuConflicts,
    rejectedRows,
    missingLeadTimeCount,
    missingCapacityCount,
    defaultWarehouseUsed: defaultWarehouseNeeded,
    generatedIdsCount,
    totalRowsProcessed,
  };
}
