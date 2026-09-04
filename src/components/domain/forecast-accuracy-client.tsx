"use client";

import { useState } from "react";
import type { ForecastResponse } from "@/lib/forecasting/python-client";
import type { Product, Warehouse } from "@/types/supply-chain";
import { ForecastAccuracyCards } from "@/components/domain/forecast-accuracy-cards";
import { ForecastAccuracyMatrix } from "@/components/domain/forecast-accuracy-matrix";
import { ForecastTrendChart } from "@/components/domain/forecast-trend-chart";
import { ForecastAccuracyTable } from "@/components/domain/forecast-accuracy-table";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ForecastAccuracyClientProps {
  forecastData: ForecastResponse;
  products: Product[];
  warehouses: Warehouse[];
}

export function ForecastAccuracyClient({
  forecastData,
  products,
  warehouses,
}: ForecastAccuracyClientProps) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  return (
    <div className="space-y-6 p-8">
      {/* Service Status Banner */}
      <div className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-surface) p-4 text-small">
        <div className="flex items-center gap-2.5">
          {forecastData.isFallback ? (
            <>
              <AlertCircle className="text-(--color-warning)" size={18} />
              <div>
                <span className="font-semibold text-(--color-text-primary)">
                  Statistical Microservice in Offline / Fallback Mode
                </span>
                <p className="text-xs text-(--color-text-muted)">
                  Forecasts and safety stock buffers are calculated using local deterministic velocity. Run `forecasting-service` to activate automated Holt-Winters & Croston tournaments.
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 className="text-(--color-success)" size={18} />
              <div>
                <span className="font-semibold text-(--color-text-primary)">
                  Live Statistical Forecaster Active (FastAPI Microservice v{forecastData.version})
                </span>
                <p className="text-xs text-(--color-text-muted)">
                  Evaluated across 7 classical candidate models with rolling-origin cross-validation and 80% prediction intervals.
                </p>
              </div>
            </>
          )}
        </div>
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
