"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { SeriesForecastResult } from "@/lib/forecasting/python-client";

interface ForecastTrendChartProps {
  results: SeriesForecastResult[];
}

export function ForecastTrendChart({ results }: ForecastTrendChartProps) {
  // Aggregate forward 28-day projection across all series
  const dateMap: Record<string, { date: string; forecast: number; lower: number; upper: number }> = {};

  for (const r of results) {
    for (const pt of r.forecast) {
      if (!dateMap[pt.date]) {
        dateMap[pt.date] = { date: pt.date, forecast: 0, lower: 0, upper: 0 };
      }
      dateMap[pt.date].forecast += pt.qty;
      dateMap[pt.date].lower += pt.lower_80;
      dateMap[pt.date].upper += pt.upper_80;
    }
  }

  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  // Bias distribution data: categorize into buckets
  let overforecastCount = 0;
  let underforecastCount = 0;
  let neutralCount = 0;

  for (const r of results) {
    if (r.accuracy.bias > 1.0) overforecastCount++;
    else if (r.accuracy.bias < -1.0) underforecastCount++;
    else neutralCount++;
  }

  const biasData = [
    { name: "Under-forecast (<-1.0)", count: underforecastCount, color: "#f59e0b" },
    { name: "Neutral (±1.0)", count: neutralCount, color: "#10b981" },
    { name: "Over-forecast (>+1.0)", count: overforecastCount, color: "#3b82f6" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 2-column wide: Aggregate Demand Projection Curve */}
      <Card className="p-6 lg:col-span-2">
        <div className="mb-4">
          <h3 className="text-h3 font-semibold text-(--color-text-primary)">
            Aggregate Forward Demand Curve & 80% Prediction Band
          </h3>
          <p className="text-small text-(--color-text-muted)">
            Sum of model tournament projections with upper/lower bounds across the next 28 days.
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
              <XAxis
                dataKey="date"
                stroke="var(--color-text-muted)"
                fontSize={11}
                tickFormatter={(val) => val.slice(5)}
              />
              <YAxis stroke="var(--color-text-muted)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="upper"
                name="80% Upper Bound"
                stroke="transparent"
                fill="var(--color-brand)"
                fillOpacity={0.12}
              />
              <Area
                type="monotone"
                dataKey="lower"
                name="80% Lower Bound"
                stroke="transparent"
                fill="var(--color-surface)"
                fillOpacity={1}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Point Forecast (Units)"
                stroke="var(--color-brand)"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 1-column wide: Portfolio Systematic Bias Distribution */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-h3 font-semibold text-(--color-text-primary)">
            Portfolio Forecast Bias Spread
          </h3>
          <p className="text-small text-(--color-text-muted)">
            Systematic skew distribution across active SKU series.
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={biasData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
              <XAxis
                dataKey="name"
                stroke="var(--color-text-muted)"
                fontSize={10}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis stroke="var(--color-text-muted)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" name="SKUs" radius={[4, 4, 0, 0]}>
                {biasData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
