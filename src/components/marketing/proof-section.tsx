export function ProofSection() {
  return (
    <section className="border-y border-(--color-border) bg-(--color-surface-secondary) py-16">
      <div className="mx-auto max-w-6xl px-6">
        {/* This product is pre-launch — there are no customers yet, so this
            section only makes claims that are independently verifiable from
            the code and the published M5 benchmark, not customer results. */}
        <p className="text-center text-caption font-bold uppercase tracking-wider text-(--color-text-secondary)">
          What&apos;s true today — no customer claims, just verifiable math
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3 text-center">
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
            <p className="text-3xl font-extrabold text-(--color-brand)">0.744 MASE</p>
            <p className="mt-1 text-small font-semibold text-(--color-text-primary)">Benchmarked forecast accuracy</p>
            <p className="text-caption text-(--color-text-secondary)">
              210 real Walmart M5 demand series vs. a naive baseline
            </p>
          </div>

          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">0</p>
            <p className="mt-1 text-small font-semibold text-(--color-text-primary)">Forecasts entered by hand</p>
            <p className="text-caption text-(--color-text-secondary)">
              Reorder points, safety stock and stockout dates come from your own transaction history
            </p>
          </div>

          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
            <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">1 import</p>
            <p className="mt-1 text-small font-semibold text-(--color-text-primary)">Spreadsheet to live dashboard</p>
            <p className="text-caption text-(--color-text-secondary)">
              Drop a messy spreadsheet and see it populated in one flow
            </p>
          </div>
        </div>

        {/* Testimonial slot — intentionally empty. Re-enable once a real
            customer quote exists. Do not fill with a placeholder name. */}
        {/*
        <div className="mt-10 rounded-2xl border border-(--color-border) bg-(--color-surface) p-8 shadow-sm">
          <div className="flex items-center gap-1 text-amber-500 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={18} fill="currentColor" />
            ))}
          </div>
          <blockquote className="text-body-lg font-medium text-(--color-text-primary) leading-relaxed">
            &ldquo;Quote goes here.&rdquo;
          </blockquote>
          <div className="mt-4 flex items-center justify-between border-t border-(--color-border) pt-4">
            <div>
              <p className="font-semibold text-body text-(--color-text-primary)">Name</p>
              <p className="text-small text-(--color-text-secondary)">Title, Company</p>
            </div>
            <span className="rounded-md bg-(--color-surface-secondary) px-3 py-1 text-caption font-semibold text-(--color-text-secondary) border border-(--color-border)">
              N Warehouses · N SKUs
            </span>
          </div>
        </div>
        */}
      </div>
    </section>
  );
}
