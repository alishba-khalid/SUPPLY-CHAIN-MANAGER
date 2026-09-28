"use client";

import { useState, type ReactNode } from "react";

/**
 * `wide`: a larger panel that keeps the label's line breaks (for multi-line explanations).
 * It opens below the trigger — opened above, a tall panel on a top-of-page card is clipped.
 */
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
          className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 text-pretty rounded-md bg-(--color-text-primary) px-2.5 py-1.5 text-caption leading-snug text-white shadow-md ${wide ? "top-full mt-1.5 w-80 whitespace-pre-line" : "bottom-full mb-1.5 w-56"}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
