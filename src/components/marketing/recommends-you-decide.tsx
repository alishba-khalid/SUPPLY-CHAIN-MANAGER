import { Eye, Search, MessageSquareText, Lightbulb, CheckCircle2, ShieldCheck } from "lucide-react";

const STEPS = [
  { icon: Eye, title: "Monitors", description: "Every SKU, supplier, and shipment across every warehouse, all day." },
  { icon: Search, title: "Finds risks", description: "Flags stockouts, overstock, and slipping supplier performance early." },
  {
    icon: MessageSquareText,
    title: "Explains why",
    description: "Shows the numbers behind every flag — demand, lead time, cash at risk.",
  },
  {
    icon: Lightbulb,
    title: "Recommends",
    description: "Suggests the specific order or supplier conversation to make it right.",
  },
  { icon: CheckCircle2, title: "You approve", description: "Nothing ships, orders, or sends until you say go." },
];

export function RecommendsYouDecide() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">Your manager recommends. You decide.</h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, i) => (
          <div key={step.title} className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-brand) text-body font-bold text-white">
                {i + 1}
              </div>
              <step.icon size={20} className="text-(--color-brand)" />
            </div>
            <h3 className="text-h3 font-semibold text-(--color-text-primary)">{step.title}</h3>
            <p className="text-small text-(--color-text-secondary) leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-secondary) p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-(--color-brand)" />
        <p className="text-small font-medium text-(--color-text-primary)">
          It never purchases inventory or contacts a supplier on its own. Every recommendation waits
          for your approval.
        </p>
      </div>
    </section>
  );
}
