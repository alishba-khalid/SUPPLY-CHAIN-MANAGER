import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState({ message = "Loading…", className }: { message?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      <Loader2 size={20} className="animate-spin text-(--color-brand)" />
      <p className="text-small text-(--color-text-muted)">{message}</p>
    </div>
  );
}
