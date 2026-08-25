import { Card } from "@/components/ui/card";

const STEPS = [
  { time: "6:00 AM", description: "Reads the last 90 days of transactions across every warehouse" },
  { time: "6:02 AM", description: "Flags 3 SKUs that dropped below their reorder point overnight" },
  { time: "6:03 AM", description: "Notices supplier OTIF fell to 71% on your second-largest vendor" },
  { time: "6:04 AM", description: "4 actions are waiting for you. Nothing has been ordered." },
];

export function MorningBriefing() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">It clocks in before you do</h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <Card key={step.time} className="p-5">
            <p className="text-body font-semibold text-(--color-brand)">{step.time}</p>
            <p className="mt-2 text-body text-(--color-text-secondary)">{step.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
