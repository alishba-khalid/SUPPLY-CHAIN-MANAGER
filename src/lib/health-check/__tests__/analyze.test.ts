import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { analyzeHealthCheckBuffer, HealthCheckInputError } from "../analyze";
import { healthCheckReportCsv } from "../report";
import { addDays, todayISODate } from "@/lib/dates";

const enc = (s: string) => new TextEncoder().encode(s);
const template = (name: string) => fs.readFileSync(path.join(process.cwd(), "public", "templates", name));

test("average-demand template: flags low cover as stockout risk and dead/over stock as excess", () => {
  const r = analyzeHealthCheckBuffer(template("health-check-template.csv"));
  assert.equal(r.skuCount, 5);
  assert.equal(r.demandSource, "average");

  const bySku = new Map(r.rows.map((row) => [row.sku, row]));
  // 120 on hand / 18 per day ≈ 6.7 days of cover.
  assert.equal(bySku.get("WIDGET-100")!.stockoutRisk, true);
  // 15,000 / 210 ≈ 71 days of cover — not at risk, not over 3x target either.
  assert.equal(bySku.get("BOLT-515")!.stockoutRisk, false);
  // Zero demand: every unit is excess.
  assert.equal(bySku.get("VALVE-420")!.excessValue, 980 * 27.8);
  assert.equal(bySku.get("VALVE-420")!.leadTimeDefaulted, true);
  assert.ok(r.topExcess[0].sku === "VALVE-420");
  assert.ok(r.warnings.some((w) => w.includes("no lead time")));
});

test("weekly history template is detected as weekly and scored", () => {
  const r = analyzeHealthCheckBuffer(template("health-check-template-weekly-history.csv"));
  assert.equal(r.demandSource, "weekly_history");
  assert.equal(r.skuCount, 3);
  const widget = r.rows.find((row) => row.sku === "WIDGET-100")!;
  // ~130/week ≈ 18.6/day against 120 on hand → under a week of cover.
  assert.ok(widget.avgDailyDemand! > 15 && widget.avgDailyDemand! < 22);
  assert.equal(widget.stockoutRisk, true);
});

test("daily history is anchored to today regardless of when the file ends", () => {
  const lines = ["sku,date,qty_sold,on_hand_qty,unit_cost"];
  const end = addDays(todayISODate(), -200); // history ended months ago
  for (let i = 0; i < 60; i++) lines.push(`A-1,${addDays(end, -i)},10,${i === 0 ? 50 : ""},${i === 0 ? 2 : ""}`);
  const r = analyzeHealthCheckBuffer(enc(lines.join("\n")));
  assert.equal(r.demandSource, "daily_history");
  const row = r.rows[0];
  assert.ok(row.avgDailyDemand !== null && row.avgDailyDemand > 0, "demand should not be lost to the 90-day window");
  assert.equal(row.stockoutRisk, true);
});

test("rejects a file without demand columns", () => {
  assert.throws(() => analyzeHealthCheckBuffer(enc("sku,on_hand_qty\nA,1")), HealthCheckInputError);
});

test("report CSV lists every SKU", () => {
  const r = analyzeHealthCheckBuffer(template("health-check-template.csv"));
  const csv = healthCheckReportCsv(r);
  assert.equal(csv.trim().split("\n").length, r.skuCount + 1);
});
