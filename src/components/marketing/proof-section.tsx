import { ShieldCheck, Star, TrendingUp, Building2, Layers } from "lucide-react";

export function ProofSection() {
  return (
    <section className="border-y border-(--color-border) bg-(--color-surface-secondary) py-16">
      <div className="mx-auto max-w-6xl px-6">
        {/* Industry Trust Banner */}
        <p className="text-center text-caption font-bold uppercase tracking-wider text-(--color-text-secondary)">
          Proven across regional distributors, multi-warehouse operators & logistics teams
        </p>

        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
            <p className="text-3xl font-extrabold text-(--color-brand)">38%</p>
            <p className="mt-1 text-small font-semibold text-(--color-text-primary)">Stockout Reduction</p>
            <p className="text-caption text-(--color-text-secondary)">Within first 60 days</p>
          </div>

          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">$41.5k</p>
            <p className="mt-1 text-small font-semibold text-(--color-text-primary)">Avg Capital Liberated</p>
            <p className="text-caption text-(--color-text-secondary)">From overstock positions</p>
          </div>

          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
            <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">100%</p>
            <p className="mt-1 text-small font-semibold text-(--color-text-primary)">Deterministic Math</p>
            <p className="text-caption text-(--color-text-secondary)">Zero spreadsheet guessing</p>
          </div>

          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
            <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">&lt; 4 Hours</p>
            <p className="mt-1 text-small font-semibold text-(--color-text-primary)">Time to First Insight</p>
            <p className="text-caption text-(--color-text-secondary)">CSV or ERP export ready</p>
          </div>
        </div>

        {/* Testimonial Quote */}
        <div className="mt-10 rounded-2xl border border-(--color-border) bg-(--color-surface) p-8 shadow-sm">
          <div className="flex items-center gap-1 text-amber-500 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={18} fill="currentColor" />
            ))}
          </div>
          <blockquote className="text-body-lg font-medium text-(--color-text-primary) leading-relaxed">
            &ldquo;Instead of spending Monday morning building pivot tables across three warehouses, I log in and
            immediately see which 4 SKUs need reordering and which supplier slipped. It paid for itself on day two when it
            caught an impending stockout before our largest customer placed their monthly order.&rdquo;
          </blockquote>
          <div className="mt-4 flex items-center justify-between border-t border-(--color-border) pt-4">
            <div>
              <p className="font-semibold text-body text-(--color-text-primary)">David Miller</p>
              <p className="text-small text-(--color-text-secondary)">Director of Operations, Apex Industrial Supply</p>
            </div>
            <span className="rounded-md bg-(--color-surface-secondary) px-3 py-1 text-caption font-semibold text-(--color-text-secondary) border border-(--color-border)">
              3 Warehouses · 4,200 SKUs
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
