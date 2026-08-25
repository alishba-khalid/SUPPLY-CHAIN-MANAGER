import { Package, ShoppingCart, Truck, Ship, Warehouse, BarChart3, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Package,
    heading: "Inventory that flags itself",
    description:
      "Days of stock, safety stock, and reorder points are calculated from real trailing-90-day demand per SKU per warehouse — not a manually entered forecast.",
  },
  {
    icon: ShoppingCart,
    heading: "Procurement you can audit",
    description:
      "Every purchase order's fulfillment rate, cycle time, and price variance against baseline cost, rolled up into one procurement health score.",
  },
  {
    icon: Truck,
    heading: "Suppliers scored on OTIF",
    description:
      "On-time-in-full delivery performance calculated from actual purchase order history, weighted by how much you actually spend with each supplier.",
  },
  {
    icon: Ship,
    heading: "Logistics before it's a fire",
    description:
      "Inbound and outbound shipments tracked against expected delivery dates, so a delayed shipment shows up as a live alert, not a customer complaint.",
  },
  {
    icon: Warehouse,
    heading: "Warehouses under or over capacity",
    description:
      "Capacity utilization scored per warehouse alongside its inventory issue rate, so you catch a space problem before it becomes a lease decision.",
  },
  {
    icon: BarChart3,
    heading: "Trends across every domain",
    description:
      "Procurement spend, on-time rate, order volume, and inventory movement charted week over week from the same dataset every other page reads.",
  },
  {
    icon: Sparkles,
    heading: "An AI Manager that shows its work",
    description:
      "Ask a plain-language question and get an answer, the evidence behind it, and a recommendation — grounded in the same data as the rest of the dashboard.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">The job description</h2>
        <p className="mt-3 text-body-lg text-(--color-text-secondary)">
          Seven things it watches so you don&apos;t have to. Every module reads from the same live
          dataset — nothing to reconcile.
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
