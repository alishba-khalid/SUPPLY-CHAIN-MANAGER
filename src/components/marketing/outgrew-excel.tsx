import { HelpCircle } from "lucide-react";

const QUESTIONS = [
  "Which products stock out next?",
  "What should I reorder today?",
  "Which supplier is delaying my orders?",
  "How much cash is tied up in excess stock?",
  "Which purchase orders need my attention?",
];

export function OutgrewExcel() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">Your business outgrew Excel.</h2>
        <p className="mt-3 text-body-lg text-(--color-text-secondary)">
          A spreadsheet can hold the data. It can&apos;t answer these on its own, every morning, across
          every warehouse.
        </p>
      </div>

      <div className="mt-10 space-y-3">
        {QUESTIONS.map((question) => (
          <div
            key={question}
            className="flex items-start gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) p-4"
          >
            <HelpCircle size={18} className="mt-0.5 shrink-0 text-(--color-brand)" />
            <p className="text-body font-medium text-(--color-text-primary)">{question}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-body-lg font-semibold text-(--color-text-primary)">
        Supply Chain Manager answers these from your data.
      </p>
    </section>
  );
}
