"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type { Explanation } from "@/lib/insights/explanations";
import { cn } from "@/lib/utils";

/** Renders a "why this number" explanation: headline, working, honest caveat, small print. */
export function ExplanationBlock({ explanation, className }: { explanation: Explanation; className?: string }) {
  return (
    <div className={cn("space-y-1.5 text-small", className)}>
      <p className="font-semibold text-(--color-text-primary)">{explanation.headline}</p>
      <ul className="space-y-0.5 text-(--color-text-secondary)">
        {explanation.lines.map((line) => (
          <li key={line} className={cn(line.startsWith("·") && "pl-3", line.startsWith("=") && "font-semibold text-(--color-text-primary)")}>
            {line}
          </li>
        ))}
      </ul>
      {explanation.warning && (
        <p className="flex gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-amber-700 dark:text-amber-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{explanation.warning}</span>
        </p>
      )}
      {explanation.note && <p className="text-caption text-(--color-text-muted)">{explanation.note}</p>}
    </div>
  );
}

/**
 * The value itself becomes a button; clicking (or tapping) it opens the
 * explanation. Click, not hover, so it works on touch screens. Closes on a
 * second click, Escape, or a click elsewhere.
 */
export function WhyPopover({ children, explanation, label }: { children: ReactNode; explanation: Explanation; label: string }) {
  // Fixed position (from the button's on-screen spot) so the panel isn't
  // clipped by a scrolling table container.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const open = pos !== null;
  const ref = useRef<HTMLDivElement>(null);
  const PANEL_WIDTH = 320;

  function toggle(button: HTMLElement) {
    if (open) return setPos(null);
    const r = button.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8)) });
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${label} — how this is calculated`}
        onClick={(e) => {
          e.stopPropagation();
          toggle(e.currentTarget);
        }}
        className="cursor-help underline decoration-dotted underline-offset-4 hover:decoration-solid focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand) rounded-sm"
      >
        {children}
      </button>
      {pos && (
        <div
          role="dialog"
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          className="z-50 rounded-lg border border-(--color-border) bg-(--color-surface) p-3 text-left whitespace-normal shadow-lg"
        >
          <ExplanationBlock explanation={explanation} />
        </div>
      )}
    </div>
  );
}
