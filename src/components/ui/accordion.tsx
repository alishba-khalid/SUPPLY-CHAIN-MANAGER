"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  question: string;
  answer: string;
}

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="divide-y divide-(--color-border) rounded-lg border border-(--color-border) bg-(--color-surface)">
      {items.map((item, i) => {
        const open = openIndex === i;
        const buttonId = `${baseId}-button-${i}`;
        const panelId = `${baseId}-panel-${i}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-body font-medium text-(--color-text-primary) hover:bg-(--color-surface-secondary)"
              >
                {item.question}
                <ChevronDown
                  size={18}
                  className={cn("shrink-0 text-(--color-text-muted) transition-transform", open && "rotate-180")}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="px-5 pb-4 text-body text-(--color-text-secondary)"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
