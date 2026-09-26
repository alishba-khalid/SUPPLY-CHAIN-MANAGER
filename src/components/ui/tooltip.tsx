"use client";

import { useState, type ReactNode } from "react";

/** `wide`: a larger panel that keeps the label's line breaks (for multi-line explanations). */
export function Tooltip({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 text-pretty rounded-md bg-(--color-text-primary) px-2.5 py-1.5 text-caption leading-snug text-white shadow-md ${wide ? "w-80 whitespace-pre-line" : "w-56"}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
