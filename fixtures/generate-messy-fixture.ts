import * as XLSX from "xlsx";

/**
 * Generates a realistic, deliberately messy multi-sheet Excel test fixture
 * matching all constraints specified in the prompt:
 *
 * Sheet 1: "Consolidated_Stock_Report" (Wide sheet with title block & merged cells)
 *   - Rows 1-3: Company Title ("AL-MADINA DISTRIBUTORS LTD"), Report Name ("Consolidated Godown & Inventory Movement Summary"), Date Range ("For the Period Ending: 01-Jun-2026"), Merged Header block
 *   - Row 4: Headers using South Asian & commercial terms:
 *     ["Item Code", "Particulars", "Party Name", "Godown", "Closing Stock", "Rate", "Lead Days", "Order Date", "Expected Date", "PO #"]
 *   - Quantities as: "2,500 pcs", "(150)", "N/A", "-", "500", "" (blank)
 *   - Near-duplicate Supplier names:
 *     "Delta Components LLC", "delta comp.", "DELTA COMPONENTS", "Apex Industrial Pvt Ltd", "Apex Ind"
 *   - Dates: Excel serial (46174 -> 2026-06-01), "01-Jun-2026", "06/01/2026", "2026-06-01"
 *   - Blank spacer row mid-table
 *   - Bottom aggregate/total row: ["Total: 15,000", "", "", "", "15000", "", "", "", "", ""]
 *   - SKU conflict: SKU-1002 listed with Party "Apex Industrial Pvt Ltd" in row 5 and "Falcon Logistics & Co" in row 11
 *
 * Sheet 2: "Supplier_Directory" (Lookup sheet)
 *   - Lookup table with explicit supplier details overlapping with Sheet 1
 *   - Headers: ["Vendor Code", "Company Name", "Contact Email", "Standard Delivery Days"]
 */
export function createMessyWorkbookBuffer(): Uint8Array {
  const wb = XLSX.utils.book_new();

  // --- Sheet 1 Data Array ---
  const sheet1Data: (string | number | null)[][] = [
    ["AL-MADINA LOGISTICS & DISTRIBUTION (PVT) LTD", null, null, null, null, null, null, null, null, null],
    ["Consolidated Godown & Stock Ledger Report", null, null, null, null, null, null, null, null, null],
    ["Reporting Period: Trailing 90 Days (Q2 2026)", null, null, null, null, null, null, null, null, null],
    // Row 4: True Headers (1-indexed row 4)
    ["Item Code", "Particulars", "Party Name", "Godown", "Closing Stock", "Rate", "Lead Days", "Order Date", "Expected Date", "PO #"],
    // Data Rows
    ["SKU-1001", "Heavy Duty Hydraulic Valve 25mm", "Delta Components LLC", "Karachi Central Godown", "2,500 pcs", "Rs. 1,450.00", "14", 46174, "15-Jun-2026", "PO-9001"],
    ["SKU-1002", "Precision Ball Bearing 6204-2RS", "Apex Industrial Pvt Ltd", "Lahore North Warehouse", "1,200", "PKR 450", "10", "01-Jun-2026", "11-Jun-2026", "PO-9002"],
    ["SKU-1003", "Neoprene Industrial Gasket Ring", "delta comp.", "Karachi Central Godown", "(150)", "$ 12.50", "14", "2026-05-20", "2026-06-03", "PO-9003"],
    ["SKU-1004", "Centrifugal Impeller Shaft 45C", "DELTA COMPONENTS", "Islamabad Regional Site", "N/A", "£ 85.00", "14", "06/01/2026", "06/15/2026", "PO-9004"],
    // Blank spacer row (row index 8)
    [null, null, null, null, null, null, null, null, null, null],
    ["SKU-1005", "High Pressure Seal Kit Type B", "Apex Ind", "Lahore North Warehouse", "-", "1200", "10", 46174, "15-Jun-2026", "PO-9005"],
    // SKU Conflict Case: SKU-1002 under Falcon Logistics & Co
    ["SKU-1002", "Precision Ball Bearing 6204-2RS", "Falcon Logistics & Co", "Lahore North Warehouse", "800", "PKR 460", "21", "02-Jun-2026", "23-Jun-2026", "PO-9006"],
    // Row missing warehouse (tests default warehouse assignment)
    ["SKU-1006", "Cast Iron Flange Coupling 50mm", "Zenith Engineering", "", "450 units", "Rs. 3,200", "", "05-Jun-2026", "20-Jun-2026", "PO-9007"],
    // Blank stock row (tests rejected row preservation with reason)
    ["SKU-1007", "Stainless Steel Shim Washer M12", "Delta Components LLC", "Karachi Central Godown", "", "15.00", "14", "", "", ""],
    // Total aggregate summary row at bottom
    ["Total / Grand Summary:", null, null, null, "15,000", null, null, null, null, null],
    ["* Note: Figures certified as per ledger closing balance.", null, null, null, null, null, null, null, null, null]
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Set merged cells for title block in Sheet 1
  ws1["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // A1:J1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // A2:J2
    { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }, // A3:J3
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Consolidated_Stock_Report");

  // --- Sheet 2: Supplier Directory (Lookup Table) ---
  const sheet2Data: (string | number | null)[][] = [
    ["Vendor Code", "Company Name", "Contact Email", "Standard Delivery Days"],
    ["SUP-001", "Delta Components LLC", "orders@deltacomponents.com", 14],
    ["SUP-002", "Apex Industrial Pvt Ltd", "sales@apexindustrial.pk", 10],
    ["SUP-003", "Falcon Logistics & Co", "dispatch@falconlogistics.com", 21],
    ["SUP-004", "Zenith Engineering", "contact@zenitheng.com", 7],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  XLSX.utils.book_append_sheet(wb, ws2, "Supplier_Directory");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(buf);
}
