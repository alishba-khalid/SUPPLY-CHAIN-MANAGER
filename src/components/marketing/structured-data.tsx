import { SITE_NAME, SITE_URL, CONTACT_EMAIL, TAGLINE, PRICING_TIERS } from "@/lib/site-config";
import { FAQ_ITEMS } from "./faq";

/** Escapes "</" so embedded JSON can never prematurely close the surrounding <script> tag. */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}

export function StructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    email: CONTACT_EMAIL,
  };

  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: TAGLINE,
    offers: PRICING_TIERS.filter((tier) => !tier.contactUsInstead).map((tier) => ({
      "@type": "Offer",
      name: tier.name,
      price: tier.monthlyPrice.toString(),
      priceCurrency: "USD",
      description: tier.audience,
    })),
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(softwareApplication) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqPage) }} />
    </>
  );
}
