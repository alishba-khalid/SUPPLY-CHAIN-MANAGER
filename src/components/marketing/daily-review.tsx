import { OctagonAlert, ShoppingCart, Truck, Banknote } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Every example below is grounded in the seeded demo dataset
 * (prisma/seed-canonical.ts, org_demo) so it can be checked against the
 * live demo: SKU-1015 at NDC is the one real stock-out-risk position (32 on
 * hand, ~10/day demand, 3.2 days of cover); its supplier SUP-004 (Orion
 * Electronics) is the seeded 0%-OTIF supplier with 2 overdue POs; SKU-1001
 * at NDC is a real overstock position (1,000 on hand vs. an ~380-unit
 * threshold). The reorder quantity/cost follow the same formula as
 * src/lib/insights/alerts.ts's stockout-tier suggestion.
 */
const CARDS = [
  {
    icon: OctagonAlert,
    toneClass: "bg-(--color-critical-bg) text-(--color-critical)",
    title: "What needs attention",
    example: "SKU-1015 at NDC has 3 days until stockout — already below its reorder point.",
  },
  {
    icon: ShoppingCart,
    toneClass: "bg-(--color-brand-subtle) text-(--color-brand-hover)",
    title: "What to buy",
    example:
      "Order 150 units of SKU-1015 from Orion Electronics (SUP-004) — about $1,230, enough to cover its 12-day lead time.",
  },
  {
    icon: Truck,
    toneClass: "bg-(--color-warning-bg) text-(--color-warning)",
    title: "What's delayed",
    example: "2 open purchase orders from Orion Electronics (SUP-004) are overdue — trailing OTIF has fallen to 0%.",
  },
  {
    icon: Banknote,
    toneClass: "bg-(--color-info-bg) text-(--color-info)",
    title: "Where cash is trapped",
    example: "SKU-1001 at NDC is holding 1,000 units against a healthy target near 380 — about $7,770 sitting in excess inventory.",
  },
];

export function DailyReview() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">Your supply chain, reviewed every morning.</h2>
        <p className="mt-3 text-body-lg text-(--color-text-secondary)">
          Four questions it answers before you sit down — each pulled straight from your own data.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <Card key={card.title} className="p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${card.toneClass}`}>
              <card.icon size={20} />
            </div>
            <h3 className="mt-4 text-h3 text-(--color-text-primary)">{card.title}</h3>
            <p className="mt-2 text-body text-(--color-text-secondary)">{card.example}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
