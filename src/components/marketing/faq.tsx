import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { TRIAL_DAYS } from "@/lib/site-config";

export const FAQ_ITEMS: AccordionItem[] = [
  {
    question: "What data do I need to start?",
    answer:
      "Your product catalog, current inventory by warehouse, supplier list with lead times, and recent purchase order and sales history. The more transaction history you bring, the more accurate the demand and reorder calculations are from day one.",
  },
  {
    question: "Does it work with my existing ERP or spreadsheets?",
    answer:
      "Yes. We map your existing product, warehouse, supplier, and order data into the dashboard during onboarding — you don't need to change how you run operations to get started.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most distributors are looking at real numbers within an afternoon. Full accuracy on demand-driven reorder points builds up over your first 90 days of transaction history.",
  },
  {
    question: "How is my data secured?",
    answer:
      "Your data is encrypted in transit and at rest, and isolated per company — nothing is shared across customers. Enterprise plans add SSO and role-based access.",
  },
  {
    question: "How many users can I add?",
    answer:
      "Starter and Growth plans include multiple users at no extra cost; Enterprise plans support unlimited users with role-based permissions.",
  },
  {
    question: "What happens after the trial?",
    answer: `After ${TRIAL_DAYS} days, you choose a plan to continue. If you don't, your account moves to read-only and no charges are made automatically.`,
  },
  {
    question: "What happens when I hit my plan's limit?",
    answer:
      "We'll let you know before you hit a warehouse or SKU limit. You can upgrade at any time — nothing shuts off automatically.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes. Upgrade or downgrade whenever your operation changes — the difference is prorated on your next invoice.",
  },
  {
    question: "Do I need a card to start the trial?",
    answer: `No. The ${TRIAL_DAYS}-day trial starts without payment details — you only enter billing information if you decide to continue.`,
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
