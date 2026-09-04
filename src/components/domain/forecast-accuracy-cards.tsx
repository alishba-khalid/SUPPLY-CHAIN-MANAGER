import { MetricCard } from "@/components/ui/metric-card";
import type { PortfolioSummary } from "@/lib/forecasting/python-client";
import { Target, TrendingUp, Scale, Award } from "lucide-react";

interface ForecastAccuracyCardsProps {
  summary: PortfolioSummary;
  isFallback?: boolean;
}

export function ForecastAccuracyCards({ summary, isFallback }: ForecastAccuracyCardsProps) {
  const wapePercent = (summary.portfolio_wape * 100).toFixed(1) + "%";
  const biasLabel = summary.portfolio_bias > 0
    ? `+${summary.portfolio_bias.toFixed(1)} u/day (Over-forecasting)`
    : summary.portfolio_bias < 0
    ? `${summary.portfolio_bias.toFixed(1)} u/day (Under-forecasting)`
    : "Neutral (0.0 u/day)";

  // Find top method
  const topMethod = Object.entries(summary.method_distribution || {}).sort((a, b) => b[1] - a[1])[0] || ["SMA (14d)", 0];
  const topMethodShare = summary.total_series > 0
    ? `${Math.round((topMethod[1] / summary.total_series) * 100)}% share`
    : "0% share";

  const maseVal = summary.portfolio_mase.toFixed(2);
  const maseHelp = summary.portfolio_mase < 1.0
    ? `${Math.round((1.0 - summary.portfolio_mase) * 100)}% lift vs Naive`
    : "Baseline parity";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Portfolio WAPE"
        value={wapePercent}
        helpText={summary.portfolio_wape <= 0.25 ? "Excellent accuracy (target < 25%)" : "Needs volatility tuning"}
        icon={<Target size={18} />}
        trend={{
          direction: summary.portfolio_wape <= 0.25 ? "down" : "up",
          label: summary.portfolio_wape <= 0.25 ? "Optimal" : "Elevated",
          positive: summary.portfolio_wape <= 0.25,
        }}
      />

      <MetricCard
        label="Net Forecast Bias"
        value={summary.portfolio_bias === 0 ? "0.0 units" : `${summary.portfolio_bias > 0 ? "+" : ""}${summary.portfolio_bias.toFixed(1)}`}
        helpText={biasLabel}
        icon={<Scale size={18} />}
        trend={{
          direction: summary.portfolio_bias >= 0 ? "up" : "down",
          label: Math.abs(summary.portfolio_bias) < 2.0 ? "Balanced" : "Skewed",
          positive: Math.abs(summary.portfolio_bias) < 2.0,
        }}
      />

      <MetricCard
        label="Value-Add (MASE)"
        value={maseVal}
        helpText={maseHelp}
        icon={<TrendingUp size={18} />}
        trend={{
          direction: summary.portfolio_mase < 1.0 ? "down" : "up",
          label: summary.portfolio_mase < 1.0 ? "Beating Naive" : "At Parity",
          positive: summary.portfolio_mase < 1.0,
        }}
      />

      <MetricCard
        label="Tournament Winner"
        value={topMethod[0]}
        helpText={`${topMethod[1]} series (${topMethodShare})`}
        icon={<Award size={18} />}
      />
    </div>
  );
}
