import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { TRIAL_DAYS } from "@/lib/site-config";

export function FinalCta() {
  return (
    <section className="bg-(--color-brand)">
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="text-h1 text-white">Your supply chain just hired a manager.</h2>
        <p className="mt-3 text-body-lg text-white/80">{TRIAL_DAYS}-day free trial. No credit card required.</p>
        <div className="mt-8">
          <Link href="/dashboard/overview" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            Start free trial
          </Link>
        </div>
      </div>
    </section>
  );
}
