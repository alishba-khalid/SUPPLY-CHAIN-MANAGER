"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { SkuWarehouseProjection, ProjectionArrival } from "@/lib/forecasting/demand-forecast";

interface ChartPoint {
  day: number;
  date: string;
  balance: number;
  arrivals: ProjectionArrival[];
}

function buildChartData(projection: SkuWarehouseProjection): ChartPoint[] {
  return [
    { day: 0, date: projection.today, balance: projection.currentOnHand, arrivals: [] },
    ...projection.series.map((d) => ({ day: d.day, date: d.date, balance: d.closingBalance, arrivals: d.arrivals })),
  ];
}

/**
 * Recharts' own "nice tick" generation for a `type="number"` axis with an
 * explicit array `domain` occasionally emits duplicate/garbage-magnitude
 * labels on this chart shape (verified against production — the plotted
 * line's proportions are correct, only the tick text is wrong). Computing
 * clean, evenly-spaced whole-unit ticks ourselves sidesteps it entirely.
 */
function computeNiceTicks(min: number, max: number, count = 5): number[] {
  const range = Math.max(1, max - min);
  const rawStep = range / (count - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  const niceStep = Math.max(1, Math.round((residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1) * magnitude));
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let v = niceMin; v <= max + niceStep * 0.5; v += niceStep) {
    ticks.push(Math.round(v));
  }
  return ticks;
}

/** Custom dot renderer: only draws a marker on days an inbound PO lands — overdue POs get a distinct style. */
function makeArrivalDot(compact: boolean) {
  return function ArrivalDot(props: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) {
    const { cx, cy, payload, index } = props;
    if (cx === undefined || cy === undefined || !payload || payload.arrivals.length === 0) {
      return <g key={`dot-${index}`} />;
    }
    return (
      <g key={`arrival-${payload.day}`}>
        {payload.arrivals.map((a, i) => (
          <g key={a.poNumber}>
            <circle
              cx={cx}
              cy={cy}
              r={compact ? 3.5 : 6}
              fill={a.isOverdue ? "var(--color-critical)" : "var(--color-success)"}
              stroke="var(--color-surface)"
              strokeWidth={1.5}
            />
            {!compact && (
              <>
                <text
                  x={cx}
                  y={cy - 12 - i * 24}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--color-text-primary)"
                >
                  {a.poNumber} +{a.quantity.toLocaleString()}
                </text>
                {a.isOverdue && (
                  <text
                    x={cx}
                    y={cy - 12 - i * 24 + 12}
                    textAnchor="middle"
                    fontSize={9.5}
                    fill="var(--color-critical)"
                  >
                    was due {a.originalExpectedDate}
                  </text>
                )}
              </>
            )}
          </g>
        ))}
      </g>
    );
  };
}

function SawtoothTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-caption shadow-md">
      <p className="font-semibold text-(--color-text-primary)">
        Day {point.day} · {point.date}
      </p>
      <p className="text-(--color-text-secondary)">
        Projected balance: <span className="font-semibold text-(--color-text-primary)">{Math.round(point.balance).toLocaleString()}</span> units
      </p>
      {point.arrivals.map((a) => (
        <p key={a.poNumber} className={a.isOverdue ? "text-(--color-critical)" : "text-emerald-600 dark:text-emerald-400"}>
          {a.poNumber}: +{a.quantity.toLocaleString()} units{a.isOverdue ? ` (revised ETA, was due ${a.originalExpectedDate})` : " arrives"}
        </p>
      ))}
    </div>
  );
}

export function SawtoothChart({
  projection,
  height = 300,
  compact = false,
}: {
  projection: SkuWarehouseProjection;
  height?: number;
  compact?: boolean;
}) {
  const data = buildChartData(projection);
  const balances = data.map((d) => d.balance);
  const minBalance = Math.min(0, ...balances);
  const maxBalance = Math.max(projection.reorderPoint, projection.safetyStock, ...balances);
  const padding = Math.max(5, Math.round((maxBalance - minBalance) * (compact ? 0.15 : 0.35)));
  const yMin = minBalance - padding;
  const yMax = maxBalance + padding;
  const yTicks = computeNiceTicks(yMin, yMax);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: compact ? 6 : 40, right: compact ? 4 : 16, left: compact ? -32 : 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          <XAxis
            dataKey="day"
            stroke="var(--color-text-muted)"
            fontSize={11}
            tickFormatter={(d: number) => `d${d}`}
            hide={compact}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            fontSize={11}
            width={52}
            hide={compact}
            domain={[yMin, yMax]}
            ticks={yTicks}
            tickFormatter={(v: number) => Math.round(v).toLocaleString()}
          />
          {!compact && <Tooltip content={<SawtoothTooltip />} />}

          {/* Stockout window (red) and below-safety-stock window (amber) */}
          <ReferenceArea y1={yMin} y2={0} fill="var(--color-critical)" fillOpacity={0.1} ifOverflow="visible" />
          <ReferenceArea y1={0} y2={projection.safetyStock} fill="var(--color-warning)" fillOpacity={0.08} ifOverflow="visible" />

          <ReferenceLine y={0} stroke="var(--color-critical)" strokeDasharray="4 3" strokeOpacity={0.8} />
          <ReferenceLine
            y={projection.safetyStock}
            stroke="var(--color-warning)"
            strokeDasharray="4 3"
            strokeOpacity={0.8}
            label={compact ? undefined : { value: "Safety stock", position: "insideBottomLeft", fontSize: 10, fill: "var(--color-warning)" }}
          />
          <ReferenceLine
            y={projection.reorderPoint}
            stroke="var(--color-brand)"
            strokeDasharray="4 3"
            strokeOpacity={0.8}
            label={compact ? undefined : { value: "Reorder point", position: "insideTopLeft", fontSize: 10, fill: "var(--color-brand)" }}
          />

          <Line
            type="linear"
            dataKey="balance"
            stroke="var(--color-text-primary)"
            strokeWidth={compact ? 1.75 : 2.5}
            dot={makeArrivalDot(compact)}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
