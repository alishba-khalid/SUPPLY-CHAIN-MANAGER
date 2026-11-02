import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { DesignPartnerForm } from "@/components/marketing/design-partner-form";
import { DESIGN_PARTNER_SPOTS, SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `Design Partner Program | ${SITE_NAME}`;
const DESCRIPTION = `${DESIGN_PARTNER_SPOTS} spots for US distributors: the Growth plan free for 3 months and direct access to the founder, in exchange for regular feedback.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/design-partner` },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/design-partner`, siteName: SITE_NAME, type: "website" },
};

export default function DesignPartnerPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-small font-medium uppercase tracking-wide text-(--color-text-muted)">
        {DESIGN_PARTNER_SPOTS} spots for US distributors
      </p>
      <h1 className="mt-2 text-h1 text-(--color-text-primary)">Apply as a design partner</h1>
      <p className="mt-4 text-body-lg text-(--color-text-secondary)">
        Design partners get the Growth plan free for 3 months and direct access to the founder. In return: a
        30-minute onboarding call, feedback every two weeks, and permission to publish an anonymized case study with
        before/after numbers.
      </p>

      <Card className="mt-10 p-6 sm:p-8">
        <DesignPartnerForm />
      </Card>
    </div>
  );
}
