import { Database, MapPin, SlidersHorizontal, Sparkles, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    icon: Database,
    title: "Connect your data",
    description: "Import products, POs, and transactions from CSV, Excel, or direct ERP export.",
  },
  {
    icon: MapPin,
    title: "Map facilities and suppliers",
    description: "Define where stock lives and who supplies each SKU with their actual lead times.",
  },
  {
    icon: SlidersHorizontal,
    title: "Review calculated stock ranges",
    description: "Safety stock and reorder points are computed automatically from real demand velocity.",
  },
  {
    icon: Sparkles,
    title: "Act on prioritized decisions",
    description: "Every morning, see exactly which SKUs, suppliers, and shipments require an order or adjustment.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-caption font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
          <CheckCircle2 size={14} />
          Works alongside your existing ERP. Live in an afternoon.
        </div>
        <h2 className="text-h1 text-(--color-text-primary)">Day one on the job</h2>
        <p className="mt-3 text-body-lg text-(--color-text-secondary)">
          No rip-and-replace. No months of consulting. Simply import your operational files and get immediate visibility.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-brand) text-body font-bold text-white">
                {i + 1}
              </div>
              <step.icon size={20} className="text-(--color-brand)" />
            </div>
            <h3 className="text-h3 font-semibold text-(--color-text-primary)">{step.title}</h3>
            <p className="text-body text-(--color-text-secondary) leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
