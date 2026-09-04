/**
 * Robust value cleaning for numbers, dates, strings, and identifiers.
 */

/**
 * Cleans numeric strings with currency signs, commas, units, parentheses.
 * Returns null for missing / unknown values ("-", "N/A", null) — NOT zero.
 */
export function cleanNumericValue(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }

  let str = String(val).trim();
  if (!str || str === "-" || str === "--" || /^n\/?a$/i.test(str) || /^nil$/i.test(str) || /^null$/i.test(str)) {
    return null;
  }

  // Check for accounting parentheses negative: "(150)" -> -150
  let isNegative = false;
  if (/^\(.*\)$/.test(str)) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith("-")) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Strip currency symbols (Rs, PKR, $, £, €, ₹, AED, etc.) and units (pcs, units, kg, bags, etc.)
  str = str
    .replace(/^(rs\.?|pkr|\$|£|€|₹|aed|cad|aud)\s*/i, "")
    .replace(/\s*(pcs|pieces|units|items|ea|box|cartons|kg|gm|lbs|m|mtrs)$/i, "")
    .replace(/,/g, "") // remove thousands separators
    .trim();

  // Extract first valid decimal sequence
  const match = str.match(/^-?\d+(\.\d+)?/);
  if (!match) return null;

  const num = parseFloat(match[0]);
  if (isNaN(num)) return null;

  return isNegative ? -Math.abs(num) : num;
}

/**
 * Converts Excel serial date or standard date string to JavaScript Date.
 * Excel serial epoch: 1899-12-30 (25569 days to 1970-01-01).
 */
export function excelSerialToDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400 * 1000;
  const dateInfo = new Date(utcValue);

  // Correct for fractional day time zone offset if needed
  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  const totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return new Date(Date.UTC(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate(), hours, minutes, seconds));
}

const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parses multi-format date strings cleanly:
 * - Excel serial number (e.g. 46174 -> 2026-06-01)
 * - ISO format (2026-06-01)
 * - DD-MMM-YYYY or DD-MMM-YY (01-Jun-2026)
 * - Slash/Hyphen numeric dates (DD/MM/YYYY vs MM/DD/YYYY)
 */
export function cleanDateValue(
  val: unknown,
  formatPreference: "DD/MM" | "MM/DD" = "DD/MM"
): Date | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // Handle number as Excel serial date
  if (typeof val === "number") {
    if (val > 10000 && val < 80000) {
      return excelSerialToDate(val);
    }
    return null;
  }

  const str = String(val).trim();
  if (!str || str === "-" || /^n\/?a$/i.test(str) || /^null$/i.test(str)) {
    return null;
  }

  // Numeric string representation of serial date (e.g. "46174")
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 10000 && num < 80000) {
      return excelSerialToDate(num);
    }
  }

  // Check DD-MMM-YYYY or DD-MMM-YY (e.g. "01-Jun-2026" or "15-Jun-26")
  const mmmMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
  if (mmmMatch) {
    const day = parseInt(mmmMatch[1], 10);
    const monthStr = mmmMatch[2].toLowerCase();
    let year = parseInt(mmmMatch[3], 10);
    if (year < 100) year += 2000;
    const month = MONTH_NAMES_MAP[monthStr];
    if (month !== undefined) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // Check MMM-DD-YYYY (e.g. "Jun 01, 2026")
  const mmmFirstMatch = str.match(/^([A-Za-z]{3})[-/ ](\d{1,2})[, ]+(\d{2,4})$/);
  if (mmmFirstMatch) {
    const month = MONTH_NAMES_MAP[mmmFirstMatch[1].toLowerCase()];
    const day = parseInt(mmmFirstMatch[2], 10);
    let year = parseInt(mmmFirstMatch[3], 10);
    if (year < 100) year += 2000;
    if (month !== undefined) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // Check ISO format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // Check numeric slash/hyphen dates: XX/YY/ZZZZ
  const slashMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;

    let day: number;
    let month: number;

    // Disambiguation
    if (p1 > 12 && p2 <= 12) {
      // Must be DD/MM
      day = p1;
      month = p2 - 1;
    } else if (p2 > 12 && p1 <= 12) {
      // Must be MM/DD
      month = p1 - 1;
      day = p2;
    } else {
      // Use formatPreference
      if (formatPreference === "MM/DD") {
        month = p1 - 1;
        day = p2;
      } else {
        day = p1;
        month = p2 - 1;
      }
    }

    return new Date(Date.UTC(year, month, day));
  }

  // Fallback to standard JS Date parsing
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Scans an entire date column to detect whether the format is DD/MM vs MM/DD.
 */
export function detectColumnDateFormat(values: unknown[]): "DD/MM" | "MM/DD" | "AMBIGUOUS" {
  let foundDDFirst = false;
  let foundMMFirst = false;

  for (const v of values) {
    if (!v) continue;
    const str = String(v).trim();
    const match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (match) {
      const p1 = parseInt(match[1], 10);
      const p2 = parseInt(match[2], 10);
      if (p1 > 12 && p2 <= 12) {
        foundDDFirst = true; // First number > 12 -> must be DD/MM
      } else if (p2 > 12 && p1 <= 12) {
        foundMMFirst = true; // Second number > 12 -> must be MM/DD
      }
    }
  }

  if (foundDDFirst && !foundMMFirst) return "DD/MM";
  if (foundMMFirst && !foundDDFirst) return "MM/DD";
  return "AMBIGUOUS";
}

/**
 * Trims and collapses internal consecutive whitespace.
 */
export function cleanString(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/\s+/g, " ").trim();
}
