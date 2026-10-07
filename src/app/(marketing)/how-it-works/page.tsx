import type { Metadata } from "next";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { DailyReview } from "@/components/marketing/daily-review";
import { PageIntro } from "@/components/marketing/page-intro";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `How It Works | ${SITE_NAME}`;
const DESCRIPTION =
  "Import your spreadsheets, and every morning Supply Chain Manager reviews inventory, suppliers and purchase orders across every warehouse and lists the decisions that need you.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/how-it-works` },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/how-it-works`, siteName: SITE_NAME, type: "website" },
};

export default function Page() {
  return (
    <>
      <PageIntro title="How it works" description={DESCRIPTION} />
      <HowItWorks />
      <DailyReview />
    </>
  );
}
