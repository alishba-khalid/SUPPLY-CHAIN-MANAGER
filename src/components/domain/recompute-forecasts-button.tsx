"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recomputeForecastsAction } from "@/app/actions/forecasts";

function formatComputedAt(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function RecomputeForecastsButton({ lastComputedAt }: { lastComputedAt: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [computedAt, setComputedAt] = useState(lastComputedAt);

  function handleClick() {
    startTransition(async () => {
      const res = await recomputeForecastsAction();
      if (res.success) {
        setComputedAt(new Date().toISOString());
        setMessage(
          res.isDemo
            ? `Recomputed ${res.processed} of ${res.total} series (demo subset).`
            : `Recomputed ${res.processed} of ${res.total} series.`
        );
      } else {
        setMessage("error" in res && res.error ? res.error : "Recompute failed — see server logs.");
      }
      setTimeout(() => setMessage(null), 5000);
    });
  }

  return (
    <div className="flex items-center gap-3 text-caption text-(--color-text-muted)">
      <span>Forecasts last computed: {formatComputedAt(computedAt)}</span>
      <Button variant="secondary" size="sm" onClick={handleClick} disabled={isPending}>
        <RefreshCw size={14} className={isPending ? "animate-spin" : undefined} />
        {isPending ? "Recomputing…" : "Recompute forecasts"}
      </Button>
      {message && <span className="text-(--color-text-secondary)">{message}</span>}
    </div>
  );
}
