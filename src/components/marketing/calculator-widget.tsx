"use client";

import { useState } from "react";
import {
  SERVICE_LEVEL_Z,
  economicOrderQuantity,
  reorderPoint,
  simpleSafetyStock,
  statisticalSafetyStock,
} from "@/lib/calculators";
import type { ToolId } from "@/lib/tool-pages";

const INPUT = "mt-1 w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-body text-(--color-text-primary)";
const LABEL = "block text-small font-medium text-(--color-text-primary)";

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

function Field({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input id={id} inputMode="decimal" className={INPUT} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="mt-1 text-caption text-(--color-text-muted)">{hint}</p>}
    </div>
  );
}

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div aria-live="polite" className="mt-6 rounded-xl border border-(--color-brand) bg-(--color-brand-subtle) p-5 text-body text-(--color-text-primary)">
      {children}
    </div>
  );
}

function ReorderPoint() {
  const [d, setD] = useState("21");
  const [l, setL] = useState("8");
  const [s, setS] = useState("84");
  const dd = num(d), ll = num(l), ss = num(s);
  const ok = dd !== null && ll !== null && ss !== null;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id="rp-d" label="Average daily demand (units)" value={d} onChange={setD} />
      <Field id="rp-l" label="Lead time (days)" value={l} onChange={setL} />
      <Field id="rp-s" label="Safety stock (units)" value={s} onChange={setS} />
      <div className="sm:col-span-3">
        <Result>
          {ok ? (
            <>
              <p>
                Lead time demand: <strong>{fmt(dd * ll, 1)}</strong> units
              </p>
              <p className="mt-1">
                Reorder point: <strong>{fmt(reorderPoint(dd, ll, ss), 1)}</strong> units. Order when stock on hand plus on order reaches this level.
              </p>
            </>
          ) : (
            <p>Enter numbers of zero or more in every box.</p>
          )}
        </Result>
      </div>
    </div>
  );
}

function SafetyStock() {
  const [sl, setSl] = useState("0.95");
  const [sig, setSig] = useState("12");
  const [lt, setLt] = useState("9");
  const [maxD, setMaxD] = useState("30");
  const [maxL, setMaxL] = useState("12");
  const [avgD, setAvgD] = useState("20");
  const [avgL, setAvgL] = useState("9");
  const stat = num(sig) !== null && num(lt) !== null ? statisticalSafetyStock(Number(sl), num(sig)!, num(lt)!) : null;
  const simple = [maxD, maxL, avgD, avgL].every((v) => num(v) !== null)
    ? simpleSafetyStock(num(maxD)!, num(maxL)!, num(avgD)!, num(avgL)!)
    : null;
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-h3 font-semibold text-(--color-text-primary)">Statistical method (service level)</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ss-sl" className={LABEL}>
              Cycle service level
            </label>
            <select id="ss-sl" className={INPUT} value={sl} onChange={(e) => setSl(e.target.value)}>
              {Object.keys(SERVICE_LEVEL_Z).map((k) => (
                <option key={k} value={k}>
                  {Math.round(Number(k) * 100)}%
                </option>
              ))}
            </select>
          </div>
          <Field id="ss-sig" label="Std. deviation of daily demand (units)" value={sig} onChange={setSig} />
          <Field id="ss-lt" label="Lead time (days)" value={lt} onChange={setLt} />
        </div>
        <Result>{stat !== null ? <p>Safety stock: <strong>{fmt(stat, 1)}</strong> units (z = {SERVICE_LEVEL_Z[Number(sl)]}).</p> : <p>Enter a standard deviation of zero or more and a lead time above zero.</p>}</Result>
      </div>
      <div>
        <h3 className="text-h3 font-semibold text-(--color-text-primary)">Simple method (max minus average)</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          <Field id="ss-maxd" label="Max daily use" value={maxD} onChange={setMaxD} />
          <Field id="ss-maxl" label="Longest lead time (days)" value={maxL} onChange={setMaxL} />
          <Field id="ss-avgd" label="Average daily use" value={avgD} onChange={setAvgD} />
          <Field id="ss-avgl" label="Average lead time (days)" value={avgL} onChange={setAvgL} />
        </div>
        <Result>{simple !== null ? <p>Safety stock: <strong>{fmt(simple, 1)}</strong> units.</p> : <p>Enter numbers of zero or more in every box.</p>}</Result>
      </div>
    </div>
  );
}

function Eoq() {
  const [d, setD] = useState("5000");
  const [s, setS] = useState("50");
  const [h, setH] = useState("2.5");
  const r = num(d) !== null && num(s) !== null && num(h) !== null ? economicOrderQuantity(num(d)!, num(s)!, num(h)!) : null;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id="eoq-d" label="Annual demand (units)" value={d} onChange={setD} />
      <Field id="eoq-s" label="Cost per order ($)" value={s} onChange={setS} />
      <Field id="eoq-h" label="Holding cost per unit per year ($)" value={h} onChange={setH} hint="Unit cost × your annual carrying rate" />
      <div className="sm:col-span-3">
        <Result>
          {r ? (
            <>
              <p>
                EOQ: <strong>{fmt(r.eoq)}</strong> units, about {fmt(r.ordersPerYear, 1)} orders a year, one every {fmt(r.daysBetweenOrders)} days.
              </p>
              <p className="mt-1">
                Yearly ordering cost ${fmt(r.annualOrderingCost)}; yearly holding cost ${fmt(r.annualHoldingCost)}.
              </p>
            </>
          ) : (
            <p>Enter numbers above zero in every box.</p>
          )}
        </Result>
      </div>
    </div>
  );
}

export function CalculatorWidget({ tool }: { tool: ToolId }) {
  return (
    <section aria-label="Calculator" className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
      {tool === "reorder-point" && <ReorderPoint />}
      {tool === "safety-stock" && <SafetyStock />}
      {tool === "eoq" && <Eoq />}
      <p className="mt-4 text-caption text-(--color-text-muted)">
        Runs in your browser. Nothing you enter is stored or sent anywhere. The pre-filled numbers are illustrative.
      </p>
    </section>
  );
}
