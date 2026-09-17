import { Zap, CloudOff } from "lucide-react";

/**
 * Reflects whether STORED batch results exist for the requested series —
 * never whether a live call just timed out (there is no live call in the
 * read path anymore). "Live" as soon as the majority of series have a
 * stored result, with the pending count always shown rather than the whole
 * badge flipping to fallback over a handful of not-yet-computed series.
 */
export function ForecastModeBadge({ liveCount, totalCount }: { liveCount: number; totalCount: number }) {
  const pending = totalCount - liveCount;

  if (totalCount === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-2.5 py-1 text-caption font-medium text-(--color-text-secondary)">
        <CloudOff size={12} />
        No series to forecast yet
      </span>
    );
  }

  const isLive = liveCount > totalCount / 2;

  if (isLive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-caption font-medium text-emerald-600 dark:text-emerald-400">
        <Zap size={12} />
        Live statistical forecaster active
        {pending > 0 && ` — ${pending} series pending recompute`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-2.5 py-1 text-caption font-medium text-(--color-text-secondary)">
      <CloudOff size={12} />
      {liveCount > 0
        ? `Using local fallback — ${liveCount}/${totalCount} series have live forecasts`
        : "No stored forecasts yet — using deterministic trailing-mean fallback"}
    </span>
  );
}
