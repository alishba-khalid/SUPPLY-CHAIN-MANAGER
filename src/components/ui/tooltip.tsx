"use client";

import { useState, type ReactNode } from "react";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
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
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-56 -translate-x-1/2 text-pretty rounded-md bg-(--color-text-primary) px-2.5 py-1.5 text-caption leading-snug text-white shadow-md"
        >
          {label}
        </span>
      )}
    </span>
  );
}
