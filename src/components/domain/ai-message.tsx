import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIMessage({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-(--color-brand) px-4 py-2.5 text-body text-white">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--color-brand-subtle) text-(--color-brand-hover)">
        <Sparkles size={14} />
      </div>
      <div className={cn("max-w-[85%] rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-3")}>
        {children}
      </div>
    </div>
  );
}
