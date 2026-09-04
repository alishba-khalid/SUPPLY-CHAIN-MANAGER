"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/types/supply-chain";

export interface TrendSeries {
  name: string;
  color: string;
  data: TrendPoint[];
}

export type TrendValueFormat = "currency" | "percent" | "units";

/** Server Components can't pass functions as props, so the format is a string the client resolves. */
const FORMATTERS: Record<TrendValueFormat, (value: number) => string> = {
  currency: (v) => {
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`;
    return `$${Math.round(v).toLocaleString()}`;
  },
  percent: (v) => `${Math.round(v)}%`,
  units: (v) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`;
    return v.toLocaleString();
  },
};

const TOOLTIP_FORMATTERS: Record<TrendValueFormat, (value: number) => string> = {
  currency: (v) => `$${Math.round(v).toLocaleString()}`,
  percent: (v) => `${Math.round(v)}%`,
  units: (v) => v.toLocaleString(),
};

interface TooltipPayloadEntry {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-small shadow-sm">
      <p className="mb-1 text-(--color-text-muted)">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-3 shrink-0" style={{ backgroundColor: entry.color }} />
            {payload.length > 1 && <span className="text-(--color-text-secondary)">{entry.name}</span>}
            <span className="font-medium text-(--color-text-primary)">{valueFormatter(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A single-axis weekly trend line chart. Pass 1 series for a plain trend, 2+ for a comparison (legend shown automatically). */
export function TrendChart({
  series,
  format = "units",
  height = 220,
}: {
  series: TrendSeries[];
  format?: TrendValueFormat;
  height?: number;
}) {
  const axisFormatter = FORMATTERS[format];
  const tooltipFormatter = TOOLTIP_FORMATTERS[format];
  const labels = series[0]?.data ?? [];
  const rows = labels.map((point, i) => {
    const row: Record<string, string | number> = { label: point.label };
    series.forEach((s, si) => {
      row[`v${si}`] = s.data[i]?.value ?? 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: series.length > 1 ? 8 : 0, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="0" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--color-border)" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={axisFormatter}
        />
        <Tooltip content={<ChartTooltip valueFormatter={tooltipFormatter} />} cursor={{ stroke: "var(--color-border-strong)" }} />
        {series.length > 1 && (
          <Legend
            verticalAlign="top"
            align="left"
            height={28}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "var(--color-text-secondary)" }}
          />
        )}
        {series.map((s, i) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={`v${i}`}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
