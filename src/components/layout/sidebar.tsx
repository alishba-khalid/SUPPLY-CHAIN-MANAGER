"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from "./nav-items";

const STORAGE_KEY = "scm.sidebar.collapsed";
const listeners = new Set<() => void>();

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function setCollapsedPreference(next: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // localStorage unavailable — preference just won't persist
  }
  listeners.forEach((callback) => callback());
}

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => setCollapsedPreference(!collapsed), [collapsed]);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-(--color-border) bg-(--color-surface) transition-[width] duration-150 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-(--color-border) px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--color-brand) text-white">
          <Boxes size={16} />
        </div>
        {!collapsed && <span className="text-body font-semibold text-(--color-text-primary)">Supply Chain Manager</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-body font-medium text-(--color-text-secondary) transition-colors hover:bg-(--color-surface-secondary) hover:text-(--color-text-primary)",
                active && "bg-(--color-brand-subtle) text-(--color-brand-hover) hover:bg-(--color-brand-subtle)",
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-(--color-border) p-2">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-body font-medium text-(--color-text-secondary) transition-colors hover:bg-(--color-surface-secondary) hover:text-(--color-text-primary)",
                active && "bg-(--color-brand-subtle) text-(--color-brand-hover) hover:bg-(--color-brand-subtle)",
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-small text-(--color-text-muted) hover:bg-(--color-surface-secondary) hover:text-(--color-text-primary)"
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
