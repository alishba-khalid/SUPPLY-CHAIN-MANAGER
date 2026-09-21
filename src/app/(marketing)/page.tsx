import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { DailyReview } from "@/components/marketing/daily-review";
import { OutgrewExcel } from "@/components/marketing/outgrew-excel";
import { RecommendsYouDecide } from "@/components/marketing/recommends-you-decide";
import { StatStrip } from "@/components/marketing/stat-strip";
import { MorningBriefing } from "@/components/marketing/morning-briefing";
import { Problem } from "@/components/marketing/problem";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { BuiltForDistributors } from "@/components/marketing/built-for-distributors";
import { Qualifier } from "@/components/marketing/qualifier";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { AiSpotlight } from "@/components/marketing/ai-spotlight";
import { ProofSection } from "@/components/marketing/proof-section";
import { SalaryComparison } from "@/components/marketing/salary-comparison";
import { Pricing } from "@/components/marketing/pricing";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { StructuredData } from "@/components/marketing/structured-data";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = "Supply Chain Software for Distributors | Supply Chain Manager";
const DESCRIPTION =
  "You're not buying software, you're hiring a manager — one that reviews inventory, suppliers, and purchase orders across every warehouse every morning.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function MarketingHomePage() {
  return (
    <>
      <StructuredData />
      <Hero />
      <DailyReview />
      <OutgrewExcel />
      <RecommendsYouDecide />
      <StatStrip />
      <MorningBriefing />
      <Problem />
      <FeaturesGrid />
      <BuiltForDistributors />
      <Qualifier />
      <HowItWorks />
      <ProofSection />
      <AiSpotlight />
      <SalaryComparison />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
