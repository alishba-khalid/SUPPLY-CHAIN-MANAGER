import type { ReactNode } from "react";

export interface AIRecommendationData {
  answer: string;
  evidence: { label: string; value: string }[];
  explanation?: string;
  recommendation: string;
}

export function AIRecommendation({ data, actions }: { data: AIRecommendationData; actions?: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-body font-medium text-(--color-text-primary)">{data.answer}</p>

      {data.evidence.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-(--color-surface-secondary) p-3">
          {data.evidence.map((e) => (
            <div key={e.label}>
              <dt className="text-caption text-(--color-text-muted)">{e.label}</dt>
              <dd className="text-small font-medium text-(--color-text-primary)">{e.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {data.explanation && <p className="text-small text-(--color-text-secondary)">{data.explanation}</p>}

      <div className="rounded-md border border-(--color-brand-subtle) bg-(--color-brand-subtle)/40 p-3">
        <p className="text-caption font-medium uppercase tracking-wide text-(--color-brand-hover)">Recommendation</p>
        <p className="mt-1 text-small text-(--color-text-primary)">{data.recommendation}</p>
      </div>

      {actions && <div className="flex items-center gap-2 pt-1">{actions}</div>}
    </div>
  );
}
