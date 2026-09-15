import { Zap, CloudOff } from "lucide-react";

export function ForecastModeBadge({ isFallback }: { isFallback: boolean }) {
  if (isFallback) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-2.5 py-1 text-caption font-medium text-(--color-text-secondary)">
        <CloudOff size={12} />
        Statistical microservice offline — using deterministic trailing-mean fallback
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-caption font-medium text-emerald-600 dark:text-emerald-400">
      <Zap size={12} />
      Live statistical forecaster active
    </span>
  );
}
