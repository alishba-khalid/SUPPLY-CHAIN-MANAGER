"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  label: string;
  group?: string;
  onSelect: () => void;
}

export function Command({
  open,
  onClose,
  items,
  placeholder = "Search products, suppliers, orders…",
}: {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface) shadow-md"
      >
        <div className="flex items-center gap-2 border-b border-(--color-border) px-4 py-3">
          <Search size={16} className="text-(--color-text-muted)" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-body text-(--color-text-primary) outline-none placeholder:text-(--color-text-muted)"
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-small text-(--color-text-muted)">No results.</p>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                item.onSelect();
                onClose();
              }}
              className={cn(
                "block w-full px-4 py-2.5 text-left text-body text-(--color-text-primary) hover:bg-(--color-surface-secondary)",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
