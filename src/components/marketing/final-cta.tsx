import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="bg-(--color-brand)">
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="text-h1 text-white">Your supply chain just hired a manager.</h2>
        <p className="mt-3 text-body-lg text-white/80">See it running on real sample data. No signup needed.</p>
        <div className="mt-8">
          <Link href="/dashboard/overview?demo=true" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            See live demo
          </Link>
        </div>
      </div>
    </section>
  );
}
