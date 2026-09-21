"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SITE_NAME } from "@/lib/site-config";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  // `isSignedIn` is `undefined` until Clerk loads client-side — defaulting
  // that to "signed out" keeps this page statically prerenderable (no
  // server auth() call) and avoids a blank CTA slot on first paint, at the
  // cost of a brief flash to "Open dashboard" for the signed-in minority
  // landing back on the marketing site.
  const { isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b border-(--color-border) bg-(--color-surface)/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--color-brand) text-white">
            <Logo size={18} />
          </div>
          <span className="text-body font-semibold text-(--color-text-primary)">{SITE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-body text-(--color-text-secondary) hover:text-(--color-text-primary)"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isSignedIn ? (
            <Link href="/dashboard/overview" className={buttonVariants({ variant: "primary", size: "md" })}>
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "md" })}>
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonVariants({ variant: "primary", size: "md" })}>
                Start trial
              </Link>
            </>
          )}
        </div>

        <button
          className="text-(--color-text-secondary) md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-(--color-border) bg-(--color-surface) px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-body text-(--color-text-secondary) hover:bg-(--color-surface-secondary) hover:text-(--color-text-primary)"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-(--color-border) pt-3">
            {isSignedIn ? (
              <Link
                href="/dashboard/overview"
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: "primary", size: "md", className: "w-full" })}
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className={buttonVariants({ variant: "ghost", size: "md", className: "w-full" })}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className={buttonVariants({ variant: "primary", size: "md", className: "w-full" })}
                >
                  Start trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
