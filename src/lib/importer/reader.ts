import * as XLSX from "xlsx";
import type { RawParsedSheet } from "./types";
import { cleanString } from "./cleaner";

/**
 * Reads any workbook buffer (.xlsx, .xlsm, .csv, .tsv) and processes EVERY sheet.
 */
export function readWorkbookBuffer(buffer: Buffer | ArrayBuffer | Uint8Array): RawParsedSheet[] {
  const isBuf = typeof Buffer !== "undefined" && Buffer.isBuffer(buffer);
  const wb = XLSX.read(buffer, {
    type: isBuf ? "buffer" : "array",
    cellDates: false,
    raw: true,
  });

  const parsedSheets: RawParsedSheet[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws["!ref"]) continue;

    // 1. Forward-fill merged cells
    forwardFillMergedCells(ws);

    // 2. Convert sheet to 2D array of rows
    const rawMatrix: (string | number | boolean | Date | null)[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });

    if (rawMatrix.length === 0) continue;

    // 3. Header Detection
    const headerRowIndex = detectHeaderRowIndex(rawMatrix);
    const rawHeaders = (rawMatrix[headerRowIndex] || []).map((h) => cleanString(h));

    // Determine active column indices (drop completely empty columns)
    const activeColIndices: number[] = [];
    // reduce, not Math.max(...spread): spreading 100k+ rows overflows the call stack.
    const maxCols = rawMatrix.reduce((max, r) => Math.max(max, r?.length || 0), 0);

    for (let c = 0; c < maxCols; c++) {
      let hasData = false;
      for (let r = headerRowIndex; r < rawMatrix.length; r++) {
        const val = rawMatrix[r]?.[c];
        if (val !== null && val !== undefined && String(val).trim() !== "") {
          hasData = true;
          break;
        }
      }
      if (hasData) {
        activeColIndices.push(c);
      }
    }

    // Filter headers by active columns
    const headers = activeColIndices.map((c) => rawHeaders[c] || `Column_${c + 1}`);

    // 4. Junk Removal for data rows (rows after headerRowIndex)
    const cleanedRows: (string | number | boolean | Date | null)[][] = [];

    for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
      const fullRow = rawMatrix[r] || [];
      const row = activeColIndices.map((c) => fullRow[c] ?? null);

      // Check if entirely blank
      const isBlank = row.every((val) => val === null || val === undefined || String(val).trim() === "");
      if (isBlank) continue;

      // Check if Total / Subtotal summary row
      const firstNonEmpty = row.find((val) => val !== null && val !== undefined && String(val).trim() !== "");
      const firstStr = cleanString(firstNonEmpty);
      if (/^(total|grand\s*total|subtotal|sum|summary)\b/i.test(firstStr)) {
        continue; // drop summary rows
      }

      // Check if Footnote / Disclaimer row (starts with *, Note:, Confidential, etc.)
      if (/^(\*|note:|confidential|page\s+\d+|printed\s+on)/i.test(firstStr)) {
        continue;
      }

      cleanedRows.push(row);
    }

    if (cleanedRows.length > 0 || headers.length > 0) {
      parsedSheets.push({
        name: sheetName,
        headerRowIndex,
        headers,
        rawRows: cleanedRows,
        rowCount: cleanedRows.length,
        columnCount: headers.length,
      });
    }
  }

  return parsedSheets;
}

/**
 * Handles merged cells by forward-filling the top-left value across the merged range.
 */
function forwardFillMergedCells(ws: XLSX.WorkSheet) {
  if (!ws["!merges"]) return;

  for (const range of ws["!merges"]) {
    const startCellRef = XLSX.utils.encode_cell(range.s);
    const startVal = ws[startCellRef];
    if (!startVal) continue;

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        if (R === range.s.r && C === range.s.c) continue;
        const targetRef = XLSX.utils.encode_cell({ r: R, c: C });
        ws[targetRef] = { ...startVal };
      }
    }
  }
}

/**
 * Heuristic Header Scoring (S1.2):
 * Scans the first ~20 rows and picks the row with highest score based on:
 * - High density of non-empty cells
 * - High proportion of text strings (not numbers/dates)
 * - High uniqueness of non-empty cells
 * - Followed by type consistency in subsequent rows
 * - Penalty for single-cell title lines or report banners
 */
export function detectHeaderRowIndex(matrix: (string | number | boolean | Date | null)[][]): number {
  const maxScanRows = Math.min(20, matrix.length);
  let bestRowIndex = 0;
  let bestScore = -Infinity;

  for (let r = 0; r < maxScanRows; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;

    const nonEmpties = row.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
    const nonEmptyCount = nonEmpties.length;
    if (nonEmptyCount === 0) continue;

    // Title penalty: If only 1 or 2 cells are populated in a wide table, it's likely a title banner
    const maxRowLength = Math.max(...matrix.slice(0, maxScanRows).map((rw) => rw?.length || 0));
    if (nonEmptyCount <= 2 && maxRowLength >= 4) {
      continue;
    }

    // Fraction of cells that are text strings
    const stringCount = nonEmpties.filter((v) => typeof v === "string" && isNaN(Number(v))).length;
    const textRatio = stringCount / nonEmptyCount;

    // Fraction of unique strings
    const uniqueStrings = new Set(nonEmpties.map((v) => cleanString(v).toLowerCase()));
    const uniquenessRatio = uniqueStrings.size / nonEmptyCount;

    // Density of non-empty cells relative to max row width
    const densityRatio = maxRowLength > 0 ? nonEmptyCount / maxRowLength : 1.0;

    // Follow-through consistency: inspect next row (data row)
    let followThroughBonus = 0;
    if (r + 1 < matrix.length) {
      const nextRow = matrix[r + 1];
      if (nextRow && nextRow.length > 0) {
        const nextNonEmpties = nextRow.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
        if (nextNonEmpties.length >= nonEmptyCount * 0.7) {
          followThroughBonus = 0.5;
        }
      }
    }

    // Title banner text match penalty
    const fullRowText = nonEmpties.map((v) => String(v)).join(" ");
    let titlePenalty = 0;
    if (/report|summary|pvt|ltd|period|godown & stock|inventory ledger/i.test(fullRowText) && nonEmptyCount < 4) {
      titlePenalty = 1.0;
    }

    // Composite Header Score
    const score =
      nonEmptyCount * 2.0 +
      textRatio * 3.0 +
      uniquenessRatio * 2.0 +
      densityRatio * 2.0 +
      followThroughBonus -
      titlePenalty;

    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = r;
    }
  }

  return bestRowIndex;
}
