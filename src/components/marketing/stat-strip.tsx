const STATS = [
  { value: "6am", label: "every recommendation is waiting before your first coffee" },
  { value: "90 days", label: "of real transaction history read per SKU, per warehouse" },
  { value: "Every SKU", label: `named in every recommendation. Never "inventory is trending down."` },
  { value: "0", label: "actions taken without your approval" },
];

export function StatStrip() {
  return (
    <section className="border-y border-(--color-border) bg-(--color-surface-secondary)">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="text-h1 text-(--color-brand)">{stat.value}</p>
            <p className="mt-1 text-small text-(--color-text-secondary)">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
