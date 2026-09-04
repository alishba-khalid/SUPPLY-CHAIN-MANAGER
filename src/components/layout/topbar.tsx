"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Menu, Search, Globe, ArrowLeft } from "lucide-react";
import { Command, type CommandItem } from "@/components/ui/command";
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from "./nav-items";

export function Topbar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const router = useRouter();

  const commandItems: CommandItem[] = [...NAV_ITEMS, ...BOTTOM_NAV_ITEMS].map((item) => ({
    id: item.href,
    label: item.label,
    onSelect: () => router.push(item.href),
  }));

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-4 border-b border-(--color-border) bg-(--color-surface) px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          className="text-(--color-text-secondary) md:hidden"
          onClick={() => setMobileNavOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <button
          type="button"
          onClick={handleBack}
          title="Go back"
          className="flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-2.5 py-1 text-caption font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface-hover) hover:border-(--color-border-hover) transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <OrganizationSwitcher
          hidePersonal
          appearance={{
            elements: {
              rootBox: "text-small font-medium",
              organizationSwitcherTrigger:
                "text-(--color-text-secondary) hover:bg-(--color-surface-secondary) rounded-md px-2 py-1",
            },
          }}
        />
      </div>

      <button
        onClick={() => setCommandOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-1.5 text-small text-(--color-text-muted) sm:flex"
      >
        <Search size={14} />
        <span>Search…</span>
        <kbd className="ml-6 rounded border border-(--color-border) bg-(--color-surface) px-1.5 py-0.5 text-caption">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          title="Go to landing page"
          className="flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-2.5 py-1 text-caption font-medium text-(--color-text-secondary) hover:text-(--color-brand) hover:border-(--color-brand)/40 transition-colors"
        >
          <Globe size={13} />
          <span className="hidden sm:inline">Landing Page</span>
        </Link>
        <UserButton />
      </div>

      {mobileNavOpen && (
        <div className="absolute left-0 right-0 top-14 z-30 border-b border-(--color-border) bg-(--color-surface) p-2 shadow-md md:hidden">
          {[...NAV_ITEMS, ...BOTTOM_NAV_ITEMS].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-body text-(--color-text-primary) hover:bg-(--color-surface-secondary)"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
          <Link
            href="/"
            onClick={() => setMobileNavOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-body text-(--color-brand) hover:bg-(--color-surface-secondary)"
          >
            <Globe size={18} />
            Landing Page
          </Link>
        </div>
      )}

      <Command open={commandOpen} onClose={() => setCommandOpen(false)} items={commandItems} />
    </header>
  );
}
