import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, SITE_URL, CONTACT_EMAIL, TRIAL_DAYS } from "@/lib/site-config";

const TITLE = `Terms of Service | ${SITE_NAME}`;
const DESCRIPTION = `The terms governing use of ${SITE_NAME}.`;
const LAST_UPDATED = "September 18, 2026";

// TODO: this page is unfinished — it has no Governing Law section because no
// jurisdiction has been confirmed, and no registered legal entity/address.
// Have counsel review before relying on it. It's deliberately noindex'd and
// left out of sitemap.ts until the Governing Law section is restored with a
// real jurisdiction.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/terms` },
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/terms`,
    siteName: SITE_NAME,
    type: "website",
  },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-h3 text-(--color-text-primary)">{title}</h2>
      <div className="space-y-3 text-body text-(--color-text-secondary)">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-small font-medium uppercase tracking-wide text-(--color-text-muted)">Legal</p>
      <h1 className="mt-2 text-h1 text-(--color-text-primary)">Terms of Service</h1>
      <p className="mt-2 text-small text-(--color-text-muted)">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 space-y-10">
        <Section title="1. Acceptance of terms">
          <p>
            By creating an account or using {SITE_NAME} (the &quot;Service&quot;), you agree to these Terms of
            Service. If you&apos;re using the Service on behalf of an organization, you&apos;re agreeing on its
            behalf and confirming you have authority to do so.
          </p>
        </Section>

        <Section title="2. The Service">
          <p>
            {SITE_NAME} is a supply chain operations dashboard: inventory tracking, supplier and procurement
            scorecards, and demand-driven reorder recommendations, calculated from data you provide or connect.
          </p>
        </Section>

        <Section title="3. Accounts">
          <p>
            You&apos;re responsible for the accuracy of the information you provide and for activity under your
            account. Keep your login credentials confidential and tell us promptly at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-(--color-brand) hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            if you suspect unauthorized access.
          </p>
        </Section>

        <Section title="4. Trials, plans, and billing">
          <p>
            New accounts start with a {TRIAL_DAYS}-day trial and no payment details are required to begin. After the
            trial, you choose a paid plan to continue; if you don&apos;t, your account moves to read-only and no
            charge is made automatically. Plan limits (warehouses, SKUs, seats) are described on our pricing page and
            you&apos;ll be notified before you hit one — nothing shuts off without warning. Upgrades and downgrades
            take effect with prorated billing on your next invoice.
          </p>
        </Section>

        <Section title="5. Your data">
          <p>
            You own the operational data you upload or connect (products, inventory, suppliers, purchase orders,
            transactions). You grant us a license to process it solely to provide the Service to you. See our{" "}
            <a href="/privacy" className="font-medium text-(--color-brand) hover:underline">
              Privacy Policy
            </a>{" "}
            for details.
          </p>
        </Section>

        <Section title="6. Acceptable use">
          <ul className="list-disc space-y-2 pl-5">
            <li>Don&apos;t use the Service to violate any law or third-party right.</li>
            <li>Don&apos;t attempt to bypass usage limits, security controls, or access other organizations&apos; data.</li>
            <li>Don&apos;t interfere with or overburden the Service&apos;s infrastructure.</li>
            <li>Don&apos;t reverse-engineer the Service except as permitted by law.</li>
          </ul>
        </Section>

        <Section title="7. Intellectual property">
          <p>
            {SITE_NAME}, its software, and its branding are owned by us and our licensors. These Terms don&apos;t
            grant you any rights to our trademarks or brand assets beyond what&apos;s needed to use the Service.
          </p>
        </Section>

        <Section title="8. Termination">
          <p>
            You may cancel at any time. We may suspend or terminate accounts that violate these Terms or that pose a
            security risk to the Service or other customers. On termination, you can request export of your data for
            a reasonable period afterward — see the{" "}
            <a href="/privacy" className="font-medium text-(--color-brand) hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </Section>

        <Section title="9. Disclaimers">
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind, express or implied. We don&apos;t
            warrant that recommendations, forecasts, or health scores will be error-free or that the Service will be
            uninterrupted — see our README&apos;s stated limitations for an honest account of current edge cases
            (e.g. forecasting cold starts, which fall back to a labeled deterministic calculation rather than failing
            silently).
          </p>
        </Section>

        <Section title="10. Limitation of liability">
          <p>
            To the maximum extent permitted by law, {SITE_NAME} will not be liable for indirect, incidental,
            special, or consequential damages, or for lost profits or data, arising from your use of the Service.
            Our total liability for any claim arising from these Terms or the Service will not exceed the amount you
            paid us in the 12 months before the claim arose.
          </p>
        </Section>

        <Section title="11. Changes to these terms">
          <p>
            We may update these Terms from time to time. Material changes will be reflected by updating the
            &quot;Last updated&quot; date above.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these Terms? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-(--color-brand) hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          {/* TODO: add registered legal entity name and mailing address once confirmed. */}
        </Section>
      </div>
    </div>
  );
}
