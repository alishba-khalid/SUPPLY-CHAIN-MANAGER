import { Package, ShoppingCart, Truck, Banknote, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Package,
    heading: "Know when you're about to run out.",
    description:
      "Reorder points and safety stock, calculated from real trailing-90-day demand per SKU per warehouse — the reorder point software behind every low-stock alert, built for stockout prevention, not a guess.",
  },
  {
    icon: ShoppingCart,
    heading: "Know what to buy.",
    description:
      "Every stockout risk comes with a ready-to-approve purchase order — quantity, supplier, and cost calculated for you.",
  },
  {
    icon: Truck,
    heading: "Know which suppliers need attention.",
    description:
      "On-time-in-full delivery tracked from real purchase order history — supplier performance tracking weighted by how much you actually spend with each one.",
  },
  {
    icon: Banknote,
    heading: "Know where your cash is trapped.",
    description:
      "Overstocked positions are flagged with the exact capital tied up, so slow-moving inventory stops quietly eating your cash.",
  },
  {
    icon: Warehouse,
    heading: "See every warehouse in one view.",
    description: "Inventory, capacity, and issue rates for every facility, side by side — no separate spreadsheet per location.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">The job description</h2>
        <p className="mt-3 text-body-lg text-(--color-text-secondary)">
          Five questions distributors ask every morning, answered by inventory software built for
          distributors and wholesalers — not a bolted-on module of a general ERP.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.heading} className="p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-(--color-brand-subtle) text-(--color-brand-hover)">
              <feature.icon size={20} />
            </div>
            <h3 className="mt-4 text-h3 text-(--color-text-primary)">{feature.heading}</h3>
            <p className="mt-2 text-body text-(--color-text-secondary)">{feature.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
