import { Check } from "lucide-react";

const CHECKS = [
  "3 or more warehouses, and no single view across them",
  "500+ SKUs, with reorder points that live in someone's head",
  "Purchase orders tracked in a spreadsheet nobody trusts",
];

export function Qualifier() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h2 className="text-center text-h2 text-(--color-text-primary)">Is this you?</h2>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {CHECKS.map((check) => (
          <div key={check} className="flex items-start gap-2.5">
            <Check size={18} className="mt-0.5 shrink-0 text-(--color-brand)" />
            <p className="text-body text-(--color-text-secondary)">{check}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-body text-(--color-text-muted)">
        If two of these are true, the first morning briefing will tell you something you didn&apos;t know.
      </p>
    </section>
  );
}
