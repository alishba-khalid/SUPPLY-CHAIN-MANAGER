"use client";

import { useState } from "react";
import type { ForecastResponse } from "@/lib/forecasting/python-client";
import type { Product, Warehouse } from "@/types/supply-chain";
import { ForecastAccuracyCards } from "@/components/domain/forecast-accuracy-cards";
import { ForecastAccuracyMatrix } from "@/components/domain/forecast-accuracy-matrix";
import { ForecastTrendChart } from "@/components/domain/forecast-trend-chart";
import { ForecastAccuracyTable } from "@/components/domain/forecast-accuracy-table";
import { RecomputeForecastsButton } from "@/components/domain/recompute-forecasts-button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ForecastAccuracyClientProps {
  forecastData: ForecastResponse;
  products: Product[];
  warehouses: Warehouse[];
  lastComputedAt: string | null;
}

export function ForecastAccuracyClient({
  forecastData,
  products,
  warehouses,
  lastComputedAt,
}: ForecastAccuracyClientProps) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const totalCount = forecastData.liveCount + forecastData.pendingCount;
  // Majority-live reads as "live", same threshold as ForecastModeBadge —
  // a handful of not-yet-computed series never flips the whole page.
  const isLive = totalCount > 0 && forecastData.liveCount > totalCount / 2;

  return (
    <div className="space-y-6 p-8">
      {/* Service Status Banner */}
      <div className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-surface) p-4 text-small">
        <div className="flex items-center gap-2.5">
          {!isLive ? (
            <>
              <AlertCircle className="text-(--color-warning)" size={18} />
              <div>
                <span className="font-semibold text-(--color-text-primary)">
                  {forecastData.liveCount > 0
                    ? `Using local fallback — ${forecastData.liveCount}/${totalCount} series have stored batch results`
                    : "No stored batch results yet — using deterministic trailing-mean fallback"}
                </span>
                <p className="text-xs text-(--color-text-muted)">
                  Forecasts read from the nightly batch job&apos;s stored results, not a live call. Series without a stored result use local trailing velocity until the next batch run.
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 className="text-(--color-success)" size={18} />
              <div>
                <span className="font-semibold text-(--color-text-primary)">
                  Live statistical forecaster — {forecastData.liveCount}/{totalCount} series
                  {forecastData.pendingCount > 0 ? ` (${forecastData.pendingCount} pending recompute)` : ""}
                </span>
                <p className="text-xs text-(--color-text-muted)">
                  Evaluated by the nightly batch tournament across 9 classical candidate models with rolling-origin cross-validation and 80% prediction intervals.
                </p>
              </div>
            </>
          )}
        </div>
        <RecomputeForecastsButton lastComputedAt={lastComputedAt} />
      </div>

      {/* KPI Summary Cards */}
      <ForecastAccuracyCards summary={forecastData.summary} isFallback={forecastData.isFallback} />

      {/* Recharts Trend Curve & Bias Spread */}
      <ForecastTrendChart results={forecastData.results} />

      {/* Interactive 3x3 ABC/XYZ Segmentation Matrix */}
      <ForecastAccuracyMatrix
        results={forecastData.results}
        selectedSegment={selectedSegment}
        onSelectSegment={setSelectedSegment}
      />

      {/* Sortable SKU Tournament Table */}
      <ForecastAccuracyTable
        results={forecastData.results}
        products={products}
        warehouses={warehouses}
        selectedSegment={selectedSegment}
      />
    </div>
  );
}
