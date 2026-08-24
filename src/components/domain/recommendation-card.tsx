import type { ReactNode } from "react";
import type { Recommendation } from "@/types/supply-chain";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export function RecommendationCard({ recommendation, actions }: { recommendation: Recommendation; actions?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-body font-medium text-(--color-text-primary)">{recommendation.title}</p>
            <StatusBadge status={recommendation.priority} />
          </div>
          <p className="mt-1 text-small text-(--color-text-secondary)">{recommendation.description}</p>
          {recommendation.estimatedImpact && (
            <p className="mt-1 text-small font-medium text-(--color-brand)">{recommendation.estimatedImpact}</p>
          )}
        </div>
      </div>
      {actions && <div className="mt-3 flex items-center gap-2">{actions}</div>}
    </Card>
  );
}
