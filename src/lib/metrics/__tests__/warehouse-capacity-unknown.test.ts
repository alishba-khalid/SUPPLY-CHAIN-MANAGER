/**
 * Unknown warehouse capacity: a warehouse with no capacity (null, blank, or
 * the old 0 stand-in) shows as unknown and every capacity-derived figure —
 * utilization %, utilization score, warehouse health, the overall Supply
 * Chain Health roll-up, the "warehouse health is critical" alert — is left
 * blank or excluded, never computed against an invented capacity (50,000
 * or otherwise). A warehouse with a real capacity is unchanged.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  averageWarehouseHealth,
  capacityUtilization,
  capacityUtilizationScore,
  knownCapacity,
  utilizationBand,
  warehouseHealthScore,
} from "../warehouse";
import { overallHealthScore } from "../health";
import { buildHealthScoreAlerts, type HealthScoreContext } from "../../insights/health-alerts";
import { readWorkbookBuffer } from "../../importer/reader";
import { generateSheetColumnMappings } from "../../importer/mapping";
import { extractEntitiesFromWorkbook } from "../../importer/extractor";
import { parseTemplateRows } from "../../importer/template-rows";
import { validateRow } from "../../importer/chunked-import";

function extractCsv(csv: string) {
  const sheets = readWorkbookBuffer(Buffer.from(csv));
  const mappings = sheets.map((s) => ({ sheetName: s.name, headerRowIndex: s.headerRowIndex, mappings: generateSheetColumnMappings(s.headers, s.rawRows) }));
  return extractEntitiesFromWorkbook(sheets, mappings);
}

describe("warehouse metrics", () => {
  test("real capacity: unchanged (32,000 of 40,000 = 80%, healthy band, score 100)", () => {
    assert.equal(knownCapacity(40_000), 40_000);
    const util = capacityUtilization(32_000, 40_000);
    assert.equal(util, 80);
    assert.equal(utilizationBand(80), "healthy");
    assert.equal(capacityUtilizationScore(80), 100);
    assert.equal(warehouseHealthScore(100, 80), 90);
  });

  test("blank capacity: utilization, score and health are all null — no number invented", () => {
    for (const capacity of [null, undefined, 0, -5]) {
      assert.equal(knownCapacity(capacity), null, `capacity ${capacity} is unknown`);
      assert.equal(capacityUtilization(32_000, capacity ?? null), null, `utilization for capacity ${capacity}`);
    }
    assert.equal(warehouseHealthScore(null, 80), null);
  });

  test("the old 50,000 fallback is never used for an unknown capacity", () => {
    // Against 50,000 this would be 64%. Unknown must not produce that (or any) number.
    assert.notEqual(capacityUtilization(32_000, null), capacityUtilization(32_000, 50_000));
    assert.equal(capacityUtilization(32_000, null), null);
  });

  test("average warehouse health leaves unknown warehouses out, null when none is known", () => {
    assert.equal(averageWarehouseHealth([90, null, 70]), 80, "the unknown warehouse is excluded, not counted as 0");
    assert.equal(averageWarehouseHealth([null, null]), null);
    assert.equal(averageWarehouseHealth([]), null);
  });
});

describe("overall Supply Chain Health", () => {
  const parts = { inventory: 80, supplier: 70, procurement: 60, logistics: 90 };

  test("known warehouse score: same weighted formula as before", () => {
    const h = overallHealthScore({ ...parts, warehouse: 50 });
    // 80*.3 + 70*.2 + 60*.2 + 90*.2 + 50*.1 = 73
    assert.equal(h.overall, 73);
    assert.equal(h.warehouse, 50);
  });

  test("unknown warehouse score: excluded and the other weights re-normalized, not scored as 0", () => {
    const h = overallHealthScore({ ...parts, warehouse: null });
    // (80*.3 + 70*.2 + 60*.2 + 90*.2) / 0.9 = 68 / 0.9 = 75.6 -> 76
    assert.equal(h.overall, 76);
    assert.equal(h.warehouse, null);
    assert.notEqual(h.overall, overallHealthScore({ ...parts, warehouse: 0 }).overall);
  });
});

describe("warehouse health alert", () => {
  const ctx = (warehouse: HealthScoreContext["warehouse"]): HealthScoreContext => ({
    inventory: { score: 100, unhealthyCount: 0, totalCount: 1 },
    supplier: { score: 100 },
    procurement: { score: 100, fulfillment: 100, cycleTime: 100, priceStability: 100 },
    logistics: { score: 100, onTimeRate: 100 },
    warehouse,
  });

  test("no 'warehouse health is critical' alert when no capacity is known", () => {
    const alerts = buildHealthScoreAlerts(ctx({ score: null, worst: null }));
    assert.equal(alerts.some((a) => a.id === "ALT-HEALTH-WAREHOUSE"), false);
  });

  test("still alerts on a real, critically low warehouse score", () => {
    const worst = { warehouse: { id: 1, code: "NDC", name: "NDC", capacityUnits: 40_000 }, utilizationPercent: 20, issueRateScore: 40, score: 34 };
    const alerts = buildHealthScoreAlerts(ctx({ score: 34, worst }));
    const alert = alerts.find((a) => a.id === "ALT-HEALTH-WAREHOUSE");
    assert.ok(alert);
    assert.match(alert.description, /NDC is the weakest position at 34\/100 — 20% capacity utilization/);
  });
});

describe("imports save a blank capacity as unknown, never 50,000", () => {
  test("smart importer: one warehouse with capacity, one without", () => {
    const p = extractCsv(["Warehouse Code,Warehouse Name,Warehouse Capacity", "NDC,National DC,30000", "WEST,West Coast,"].join("\n"));
    const byCode = new Map(p.warehouses.map((w) => [w.code, w.capacityUnits]));
    assert.equal(byCode.get("NDC"), 30_000, "real capacity unchanged");
    assert.equal(byCode.get("WEST"), null, "blank capacity is unknown");
    assert.equal(p.missingCapacityCount, 1);
    assert.equal(p.warehouses.some((w) => w.capacityUnits === 50_000 || w.capacityUnits === 0), false);
  });

  test("template import: blank capacity is null, real capacity kept", () => {
    const { records, rejected } = parseTemplateRows("warehouses", [
      { "Warehouse Code": "NDC", Name: "National DC", "Capacity (Units)": "30000" },
      { "Warehouse Code": "WEST", Name: "West Coast", "Capacity (Units)": "" },
    ]);
    assert.equal(rejected.length, 0);
    assert.deepEqual(records.map((r) => r.record.capacityUnits), [30_000, null]);
  });

  test("chunked upload: a staged warehouse with no capacity is valid, not rejected", () => {
    assert.equal(validateRow({ entity: "warehouse", rowNumber: 1, data: { code: "WEST", name: "West Coast", capacityUnits: null } }), null);
    assert.equal(validateRow({ entity: "warehouse", rowNumber: 1, data: { code: "NDC", name: "National DC", capacityUnits: 30_000 } }), null);
    // Malformed upload body: typed data can't hold a string here, a raw request can.
    const malformed = { code: "X", name: "X", capacityUnits: "lots" } as unknown as { code: string; name: string; capacityUnits: number };
    assert.ok(validateRow({ entity: "warehouse", rowNumber: 1, data: malformed }), "a non-number is still rejected");
  });

  test("commit SQL no longer writes a 50,000 placeholder", async () => {
    const { COMMIT_STATEMENTS } = await import("@/data/repositories/import-staging");
    const sql = COMMIT_STATEMENTS.find((s) => s.step === "warehouse")?.sql ?? "";
    assert.ok(sql.includes("INSERT INTO warehouses"));
    assert.equal(/50000|50,000/.test(sql.replace(/--.*$/gm, "")), false);
  });
});
