"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export function Dropdown({ trigger, items }: { trigger: ReactNode; items: DropdownItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 min-w-[180px] rounded-md border border-(--color-border) bg-(--color-surface) py-1 shadow-md">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3 py-2 text-left text-body text-(--color-text-primary) hover:bg-(--color-surface-secondary)",
                item.destructive && "text-(--color-critical)",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
