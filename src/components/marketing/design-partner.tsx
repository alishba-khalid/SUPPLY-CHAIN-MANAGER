import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DESIGN_PARTNER_SPOTS } from "@/lib/site-config";

const YOU_GET = ["Growth plan free for 3 months", "Direct access to the founder"];

const YOU_GIVE = [
  "A 30-minute onboarding call",
  "Feedback every two weeks",
  "Permission to publish an anonymized case study with before/after numbers",
];

export function DesignPartner() {
  return (
    <section id="design-partner" className="mx-auto max-w-5xl px-6 py-20">
      <Card className="border-(--color-brand) p-6 ring-2 ring-(--color-brand)/20 sm:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h1 text-(--color-text-primary)">
            Design Partner Program — {DESIGN_PARTNER_SPOTS} spots for US distributors
          </h2>
          <p className="mt-3 text-body-lg text-(--color-text-secondary)">
            Help shape the product around how your operation actually runs.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">You get</p>
            <ul className="mt-3 space-y-2.5">
              {YOU_GET.map((item) => (
                <li key={item} className="flex items-start gap-2 text-body font-medium text-(--color-text-primary)">
                  <Check size={16} className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">In return</p>
            <ul className="mt-3 space-y-2.5">
              {YOU_GIVE.map((item) => (
                <li key={item} className="flex items-start gap-2 text-body text-(--color-text-secondary)">
                  <Check size={16} className="mt-1 shrink-0 text-(--color-brand)" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/design-partner" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full sm:w-auto" })}>
            Apply as a design partner
            <ArrowRight size={16} />
          </Link>
        </div>
      </Card>
    </section>
  );
}
