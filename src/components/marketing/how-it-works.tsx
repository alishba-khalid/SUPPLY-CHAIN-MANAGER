import { Database, MapPin, SlidersHorizontal, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: Database,
    title: "Connect your data",
    description: "Bring in your products, purchase orders, and transaction history from your ERP or spreadsheets.",
  },
  {
    icon: MapPin,
    title: "Map warehouses and suppliers",
    description: "Tell it where stock lives and who supplies it, including each supplier's lead time.",
  },
  {
    icon: SlidersHorizontal,
    title: "Set healthy stock ranges",
    description: "Safety stock and reorder points are calculated for you from real demand — adjust if you need to.",
  },
  {
    icon: Sparkles,
    title: "Let the AI Manager surface actions",
    description: "Every morning, see exactly which SKUs, suppliers, and shipments need a decision today.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">Day one on the job</h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <div key={step.title}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-brand) text-body font-semibold text-white">
                {i + 1}
              </div>
              <step.icon size={20} className="text-(--color-brand)" />
            </div>
            <h3 className="mt-4 text-h3 text-(--color-text-primary)">{step.title}</h3>
            <p className="mt-2 text-body text-(--color-text-secondary)">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
