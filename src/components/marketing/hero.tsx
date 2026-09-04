import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DashboardPreview } from "./dashboard-preview";
import { TRIAL_DAYS } from "@/lib/site-config";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-24 sm:pt-24">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-8">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-(--color-brand)">
            Supply chain software for distributors
          </p>
          <h1 className="mt-3 text-display text-(--color-text-primary)">
            You&apos;re not buying software. You&apos;re hiring a manager.
          </h1>
          <p className="mt-5 text-body-lg text-(--color-text-secondary)">
            Every morning it reviews inventory, suppliers, purchase orders and shipments across every
            warehouse — then hands you the short list of decisions that actually matter today. You
            approve every one. It never acts on its own.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard/overview" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full sm:w-auto" })}>
              Start free trial
              <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard/overview?demo=true" className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full sm:w-auto" })}>
              See live demo
            </Link>
          </div>
          <p className="mt-3 text-small text-(--color-text-muted)">
            {TRIAL_DAYS}-day free trial · No credit card required
          </p>
        </div>

        <div>
          <DashboardPreview />
          <p className="mt-3 text-center text-small text-(--color-text-muted)">
            Your operation, scored. The number is the point.
          </p>
        </div>
      </div>
    </section>
  );
}
