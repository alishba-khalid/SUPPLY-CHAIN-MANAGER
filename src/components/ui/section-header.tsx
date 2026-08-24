import type { ReactNode } from "react";

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-h3 text-(--color-text-primary)">{title}</h2>
        {description && <p className="mt-0.5 text-small text-(--color-text-muted)">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
