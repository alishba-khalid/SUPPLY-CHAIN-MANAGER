"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ items, defaultValue }: { items: TabItem[]; defaultValue?: string }) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);
  const activeItem = items.find((i) => i.value === active);

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-(--color-border)">
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => setActive(item.value)}
            className={cn(
              "relative px-3 py-2.5 text-body font-medium text-(--color-text-muted) transition-colors hover:text-(--color-text-primary)",
              active === item.value &&
                "text-(--color-text-primary) after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-(--color-brand)",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{activeItem?.content}</div>
    </div>
  );
}
