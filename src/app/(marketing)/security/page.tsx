import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, SITE_URL, CONTACT_EMAIL } from "@/lib/site-config";

const TITLE = `Security | ${SITE_NAME}`;
const DESCRIPTION = `Where ${SITE_NAME} hosts data, how it's encrypted, who can access it, and how to request deletion or export.`;
const LAST_UPDATED = "September 18, 2026";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/security` },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/security`,
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

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-small font-medium uppercase tracking-wide text-(--color-text-muted)">Trust</p>
      <h1 className="mt-2 text-h1 text-(--color-text-primary)">Security</h1>
      <p className="mt-2 text-small text-(--color-text-muted)">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 space-y-10">
        <Section title="Where your data is hosted">
          <p>
            {SITE_NAME} runs on Vercel, which serves the application over its global edge network and runs our
            server-side compute. Our primary database — the source of truth for products, inventory, suppliers,
            purchase orders, and transaction history — is a PostgreSQL instance hosted on Neon. Authentication and
            account/session management is handled by Clerk. We don&apos;t operate our own physical servers; all
            three providers are established infrastructure vendors we rely on rather than build ourselves.
          </p>
          <p className="rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-small text-(--color-text-muted)">
            [PLACEHOLDER: confirm the specific hosting region(s)/country for the Vercel deployment and the Neon
            database project, so we can state data residency precisely.]
          </p>
        </Section>

        <Section title="Encryption in transit">
          <p>
            All traffic to and from the application is served over HTTPS — Vercel automatically redirects any HTTP
            request to HTTPS and supports TLS 1.2 and 1.3. Connections to our Neon database also require TLS/SSL;
            Neon does not accept unencrypted connections.
          </p>
        </Section>

        <Section title="Encryption at rest">
          <p>
            Our database provider, Neon, encrypts customer data at rest using AES-256 encryption on the underlying
            storage.
          </p>
        </Section>

        <Section title="Who can access customer data">
          <p>
            Each organization&apos;s data is logically isolated from other organizations in the database. Access to
            the production database and infrastructure is limited to engineering staff who need it to operate and
            support the Service, authenticated through our infrastructure providers&apos; own account controls
            rather than shared credentials.
          </p>
          <p className="rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-small text-(--color-text-muted)">
            [PLACEHOLDER: confirm current internal access-control specifics to publish here — e.g. how many people
            have production access, whether MFA is enforced on infrastructure accounts, and whether access is
            logged/audited.]
          </p>
        </Section>

        <Section title="Data deletion and export">
          <p>
            You can request export or deletion of your organization&apos;s data at any time by emailing{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-(--color-brand) hover:underline">
              {CONTACT_EMAIL}
            </a>
            . Deletion removes your organization&apos;s records from the production database.
          </p>
          <p className="rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-small text-(--color-text-muted)">
            [PLACEHOLDER: confirm the committed turnaround time for deletion/export requests, and whether backups are
            purged on a delay after deletion (and if so, how long).]
          </p>
        </Section>

        <Section title="Demo environment">
          <p>
            The public live demo (<code>?demo=true</code>) runs against a seeded sample dataset shared by every
            visitor. Writes made in demo mode (orders, adjustments, imports) are intercepted as simulations and never
            persisted — the canonical demo dataset stays unchanged for the next visitor. No personal or customer data
            is used in the demo environment.
          </p>
        </Section>

        <Section title="Subprocessors">
          <p>We currently use the following subprocessors to provide the Service:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Vercel — application hosting and compute</li>
            <li>Neon — database hosting</li>
            <li>Clerk — authentication and account management</li>
          </ul>
          <p className="rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-small text-(--color-text-muted)">
            [PLACEHOLDER: update this list if/when additional subprocessors are added — e.g. an email/SMS provider
            for alerts or a payments processor.]
          </p>
        </Section>

        <Section title="Certifications">
          <p className="rounded-md border border-(--color-border) bg-(--color-surface-secondary) px-3 py-2 text-small text-(--color-text-muted)">
            [PLACEHOLDER: list any completed third-party security certifications (e.g. SOC 2 Type II, ISO 27001) here
            once obtained. Remove this section entirely if none apply — do not state a certification status either
            way without confirming it first.]
          </p>
        </Section>

        <Section title="Reporting a vulnerability">
          <p>
            If you believe you&apos;ve found a security vulnerability, please email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-(--color-brand) hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            with details. We ask that you give us a reasonable opportunity to investigate and address the issue
            before any public disclosure.
          </p>
        </Section>
      </div>
    </div>
  );
}
