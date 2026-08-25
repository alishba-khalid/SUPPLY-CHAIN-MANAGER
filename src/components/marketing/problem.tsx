import { TrendingDown, Dice5, BellOff } from "lucide-react";

const PROBLEMS = [
  {
    icon: TrendingDown,
    title: "Inventory drifts out of range",
    description:
      "Stock creeps toward stockout or overstock a little at a time, warehouse by warehouse, until someone notices the hard way — a lost sale or a pile of cash sitting on a shelf.",
  },
  {
    icon: Dice5,
    title: "Reorders get decided by gut feel",
    description:
      "Without real demand and lead-time numbers in front of you, \"how much should we order\" becomes a guess — too much ties up cash, too little means a stockout next month.",
  },
  {
    icon: BellOff,
    title: "Alerts nobody sees until it's too late",
    description:
      "A late shipment or an underperforming supplier is a spreadsheet problem until it's a customer problem. By the time it surfaces, the window to act on it has usually closed.",
  },
];

export function Problem() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h1 text-(--color-text-primary)">Running a distribution business shouldn&apos;t feel like this</h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <div key={problem.title}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-critical-bg) text-(--color-critical)">
              <problem.icon size={20} />
            </div>
            <h3 className="mt-4 text-h3 text-(--color-text-primary)">{problem.title}</h3>
            <p className="mt-2 text-body text-(--color-text-secondary)">{problem.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
