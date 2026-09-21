import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { TRIAL_DAYS } from "@/lib/site-config";

export const FAQ_ITEMS: AccordionItem[] = [
  {
    question: "What is Supply Chain Manager?",
    answer:
      "Inventory and purchasing software for distributors and wholesalers. Every morning it reviews your inventory, suppliers, and open purchase orders across every warehouse, and surfaces the decisions that need a human call — a reorder, a supplier issue, excess stock to clear. You approve everything it recommends.",
  },
  {
    question: "Who's it for?",
    answer:
      "Small and growing distributors and wholesalers — typically hundreds to thousands of SKUs, multiple suppliers, and inventory currently tracked in Excel or a patchwork of spreadsheets. It's inventory software for distributors who've outgrown that, not a full ERP — no ERP required to get started.",
  },
  {
    question: "Is it just an inventory system?",
    answer:
      "It's more than a running total of what's on the shelf. It reads your inventory, purchase order, and supplier data and turns it into reorder points, safety stock levels, and a prioritized list of the decisions that actually need you today.",
  },
  {
    question: "How does it decide what to reorder?",
    answer:
      "Reorder points and suggested order quantities come from your trailing 90-day demand per SKU per warehouse, combined with your supplier's actual lead time — real reorder point software, not a fixed formula you maintain by hand. When stock drops toward that point, a suggested purchase order — quantity, supplier, and cost — is ready for your approval.",
  },
  {
    question: "How does Supply Chain Health work?",
    answer:
      "It's a single 0–100 score built from five weighted components: inventory (30%), suppliers (20%), procurement (20%), logistics (20%), and warehouses (10%). 80 and up is healthy, 60–79 needs attention, below 60 is critical — and each component is visible on its own, so you can see exactly what's dragging the score down. Supplier performance tracking (on-time-in-full delivery, weighted by spend) feeds directly into it.",
  },
  {
    question: "Does it buy inventory automatically?",
    answer:
      "No — you approve every action. It recommends a specific purchase order, a supplier review, or a warehouse transfer, and explains why. Nothing happens until you approve it.",
  },
  {
    question: "How does the trial work?",
    answer: `${TRIAL_DAYS} days, no credit card required. You can also try the live demo with no signup at all — it's preloaded with a sample dataset so you can see real stockout prevention and reorder recommendations before connecting your own data. When you're ready, you choose a plan from Settings — there's no automatic billing, and nothing on your account changes when the trial period ends.`,
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-4xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">Frequently asked questions</h2>
      </div>

      <div className="mt-10">
        <Accordion items={FAQ_ITEMS} />
      </div>
    </section>
  );
}
