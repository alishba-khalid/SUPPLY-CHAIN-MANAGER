import type { Metadata } from "next";
import { Faq } from "@/components/marketing/faq";
import { FaqStructuredData } from "@/components/marketing/structured-data";
import { PageIntro } from "@/components/marketing/page-intro";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

const TITLE = `FAQ | ${SITE_NAME}`;
const DESCRIPTION =
  "Answers about what Supply Chain Manager does, who it is for, how it decides what to reorder, your data, pricing and getting started.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/faq` },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/faq`, siteName: SITE_NAME, type: "website" },
};

export default function Page() {
  return (
    <>
      <PageIntro title="Frequently asked questions" description={DESCRIPTION} />
      <FaqStructuredData />
      <Faq />
    </>
  );
}
