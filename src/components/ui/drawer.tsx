"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-full w-full max-w-md flex-col border-l border-(--color-border) bg-(--color-surface) shadow-md"
      >
        {title && (
          <div className="flex items-center justify-between border-b border-(--color-border) px-5 py-4">
            <h3 className="text-h3 text-(--color-text-primary)">{title}</h3>
            <button
              onClick={onClose}
              className="text-(--color-text-muted) hover:text-(--color-text-primary)"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
