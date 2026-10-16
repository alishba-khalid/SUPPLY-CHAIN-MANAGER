import type { GlossaryCategory, GlossaryTerm } from "./types";
import { INVENTORY_TERMS } from "./terms-inventory";
import { STOCK_TERMS } from "./terms-stock";
import { FORECASTING_TERMS } from "./terms-forecasting";
import { PURCHASING_TERMS } from "./terms-purchasing";
import { WAREHOUSE_TERMS } from "./terms-warehouse";
import { FINANCE_TERMS } from "./terms-finance";

export * from "./types";

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  ...INVENTORY_TERMS,
  ...STOCK_TERMS,
  ...FORECASTING_TERMS,
  ...PURCHASING_TERMS,
  ...WAREHOUSE_TERMS,
  ...FINANCE_TERMS,
].sort((a, b) => a.term.localeCompare(b.term));

const BY_SLUG = new Map(GLOSSARY_TERMS.map((t) => [t.slug, t]));

export function getTerm(slug: string): GlossaryTerm | undefined {
  return BY_SLUG.get(slug);
}

/**
 * Terms the blog guides already cover in depth. They appear in the glossary
 * index but link to the guide, so no glossary page competes with it.
 */
export const GUIDE_ENTRIES: { term: string; category: GlossaryCategory; href: string; definition: string }[] = [
  {
    term: "Reorder Point",
    category: "inventory",
    href: "/blog/reorder-point-formula",
    definition: "The stock level at which you place a new order so the shelf doesn't empty before the delivery arrives.",
  },
  {
    term: "Safety Stock",
    category: "inventory",
    href: "/blog/safety-stock-formula",
    definition: "The buffer of stock kept to absorb demand that runs hot or a supplier that runs late.",
  },
  {
    term: "Supplier OTIF (On Time In Full)",
    category: "purchasing",
    href: "/blog/supplier-otif",
    definition: "The share of a supplier's orders that arrived both on time and with the full quantity.",
  },
  {
    term: "Overstock",
    category: "inventory",
    href: "/blog/overstock-vs-dead-stock",
    definition: "Stock that sells, but well beyond what current demand needs.",
  },
  {
    term: "Dead Stock",
    category: "inventory",
    href: "/blog/overstock-vs-dead-stock",
    definition: "Stock with no sales at all over a recent period, such as 90 days.",
  },
];

/** The date the glossary as a whole last changed (newest term). */
export const GLOSSARY_UPDATED = GLOSSARY_TERMS.map((t) => t.updated).sort().at(-1)!;
