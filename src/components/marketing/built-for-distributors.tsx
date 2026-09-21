const TAGS = ["Hundreds to thousands of SKUs", "Multiple suppliers", "Currently running on Excel", "No ERP required"];

export function BuiltForDistributors() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 text-center">
      <h2 className="text-h1 text-(--color-text-primary)">Built for distributors who&apos;ve outgrown spreadsheets</h2>
      <p className="mt-4 text-body-lg text-(--color-text-secondary) leading-relaxed">
        Supply Chain Manager is inventory management for wholesalers and distributors growing past
        Excel — small and growing operations running hundreds to thousands of SKUs across multiple
        suppliers, with one spreadsheet holding it all together. No ERP required.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {TAGS.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-(--color-border) bg-(--color-surface-secondary) px-3.5 py-1.5 text-small font-medium text-(--color-text-secondary)"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
