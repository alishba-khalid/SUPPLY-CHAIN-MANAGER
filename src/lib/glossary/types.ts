/**
 * Supply chain glossary for the marketing site (/glossary).
 *
 * Same honesty rules as the blog (src/lib/blog/posts.ts): definitions and
 * formulas are the standard textbook ones, or the app's own (docs/metrics.md)
 * where an `inApp` note says so. Examples use made-up round numbers and are
 * labelled illustrative. Never an invented benchmark, statistic, customer or
 * result. `inApp` only describes what the product does today.
 *
 * Terms the blog already covers in depth (reorder point, safety stock,
 * OTIF, overstock, dead stock) get no glossary page of their own; the
 * glossary index links straight to the guide instead, so the two never
 * compete for the same search.
 */
import type { Inline } from "@/lib/blog/posts";

export type GlossaryCategory = "inventory" | "forecasting" | "purchasing" | "warehouse" | "finance";

export const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  inventory: "Inventory planning",
  forecasting: "Demand forecasting",
  purchasing: "Purchasing & suppliers",
  warehouse: "Warehouse & logistics",
  finance: "Inventory finance",
};

export interface GlossaryTerm {
  slug: string;
  /** Full display name, e.g. "Economic Order Quantity (EOQ)". */
  term: string;
  /** Short name used inside headings, e.g. "EOQ". */
  short: string;
  category: GlossaryCategory;
  /** One-sentence definition. Doubles as the meta description (≤160 chars). */
  definition: string;
  /** Paragraphs that explain the term. */
  explain: Inline[][];
  /** Formula lines, when the term has a standard calculation. */
  formula?: string[];
  /** Worked example paragraphs (illustrative numbers). */
  example: Inline[][];
  /** Why it matters for a wholesale distributor. */
  why: Inline[][];
  /** Common mistakes, one list item each. */
  mistakes: Inline[][];
  /** What Supply Chain Manager does with it today. Omit unless true. */
  inApp?: Inline[];
  /** Related glossary slugs. */
  related: string[];
  /** Related blog guide slugs. */
  guides?: string[];
  updated: string; // YYYY-MM-DD
}

/** Inline link to another glossary term. */
export const g = (slug: string, text: string): Inline => ({ href: `/glossary/${slug}`, text });
/** Inline link to a blog guide. */
export const guide = (slug: string, text: string): Inline => ({ href: `/blog/${slug}`, text });
