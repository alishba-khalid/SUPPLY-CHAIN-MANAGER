import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "We couldn't load this data.",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-critical-bg) text-(--color-critical)">
        <AlertTriangle size={18} />
      </div>
      <div>
        <p className="text-body font-medium text-(--color-text-primary)">{title}</p>
        {description && <p className="mt-1 text-small text-(--color-text-muted)">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
