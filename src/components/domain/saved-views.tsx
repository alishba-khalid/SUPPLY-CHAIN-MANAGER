"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bookmark, Trash2 } from "lucide-react";
import { useStoredValue } from "@/lib/use-stored-value";

interface SavedView {
  name: string;
  /** The page's query string (filters and sort), without the page number. */
  query: string;
}

const NO_VIEWS: SavedView[] = [];

/**
 * Named filter/sort combinations for a page, kept in this browser. Saving
 * stores the current URL query; opening one navigates to it.
 */
export function SavedViews({ storageKey }: { storageKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [views, setViews] = useStoredValue<SavedView[]>(storageKey, NO_VIEWS);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const current = new URLSearchParams(searchParams.toString());
  current.delete("page");
  const currentQuery = current.toString();

  function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    // Same name replaces the old view instead of adding a duplicate.
    setViews([...views.filter((v) => v.name !== trimmed), { name: trimmed, query: currentQuery }]);
    setName("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface) px-3 text-small font-medium text-(--color-text-primary) hover:bg-(--color-surface-secondary)"
      >
        <Bookmark size={14} />
        Views{views.length > 0 ? ` (${views.length})` : ""}
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 w-72 rounded-lg border border-(--color-border) bg-(--color-surface) p-3 shadow-lg">
          {views.length === 0 ? (
            <p className="text-caption text-(--color-text-muted)">No saved views yet. Set filters and sorting, then save them here.</p>
          ) : (
            <ul className="space-y-1">
              {views.map((view) => (
                <li key={view.name} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push(view.query ? `${pathname}?${view.query}` : pathname, { scroll: false });
                    }}
                    className={`flex-1 truncate rounded px-2 py-1.5 text-left text-small hover:bg-(--color-surface-secondary) ${
                      view.query === currentQuery ? "font-semibold text-(--color-brand)" : "text-(--color-text-primary)"
                    }`}
                  >
                    {view.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete view ${view.name}`}
                    onClick={() => setViews(views.filter((v) => v.name !== view.name))}
                    className="rounded p-1.5 text-(--color-text-muted) hover:bg-(--color-surface-secondary) hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={save} className="mt-3 flex gap-2 border-t border-(--color-border) pt-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this view"
              maxLength={40}
              className="h-8 min-w-0 flex-1 rounded-md border border-(--color-border) bg-(--color-surface) px-2 text-small text-(--color-text-primary) placeholder:text-(--color-text-muted)"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="h-8 rounded-md bg-(--color-brand) px-3 text-small font-medium text-white disabled:opacity-50"
            >
              Save
            </button>
          </form>
          <p className="mt-2 text-caption text-(--color-text-muted)">Saved in this browser only.</p>
        </div>
      )}
    </div>
  );
}
