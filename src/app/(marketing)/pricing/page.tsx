import type { Metadata } from "next";
import { Pricing } from "@/components/marketing/pricing";
import { SalaryComparison } from "@/components/marketing/salary-comparison";
import { PageIntro } from "@/components/marketing/page-intro";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `Pricing for Distributors | ${SITE_NAME}`;
const DESCRIPTION =
  "Monthly plans in US dollars from Starter to Enterprise. Try the live demo free; a paid plan lets you add your own data. Cancel anytime.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/pricing` },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/pricing`, siteName: SITE_NAME, type: "website" },
};

export default function Page() {
  return (
    <>
      <PageIntro title="Pricing" description={DESCRIPTION} />
      <Pricing />
      <SalaryComparison />
    </>
  );
}
