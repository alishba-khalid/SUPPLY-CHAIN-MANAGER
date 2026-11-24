import { PLAN_DEFINITIONS } from "@/lib/subscriptions/tiers";

// Our side of every price comparison comes from the plan catalog.
const STARTER_PRICE = PLAN_DEFINITIONS.starter.monthlyPrice;

/**
 * Competitor facts below were read from each vendor's own website on
 * COMPETITORS_CHECKED (see `sources`). Only what those pages state is used,
 * and vendor marketing wording is labelled as a claim. Anything a page did
 * not state is "Not confirmed" — never a guess. Re-check and move the date
 * (and the sitemap date) when you edit.
 */
export const COMPETITORS_CHECKED = "2026-11-24";
const NC = "Not confirmed";

export interface CompetitorFeature {
  feature: string;
  scm: boolean | string;
  competitor: boolean | string;
  note?: string;
}

export interface CompetitorData {
  slug: string;
  name: string;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  pricingSCM: string;
  pricingCompetitor: string;
  keyDifferences: string[];
  matrix: CompetitorFeature[];
  faq: { question: string; answer: string }[];
  /** Vendor pages the competitor facts came from. */
  sources: { label: string; url: string }[];
}

export const COMPETITORS: Record<string, CompetitorData> = {
  "inventory-planner": {
    slug: "inventory-planner",
    name: "Inventory Planner",
    tagline: "Supply Chain Manager and Inventory Planner compared for wholesale distributors.",
    metaTitle: "Supply Chain Manager vs Inventory Planner (2026 Comparison)",
    metaDescription: "Supply Chain Manager vs Inventory Planner: forecasting, purchase orders, supplier OTIF and pricing, from each vendor's own site (checked 2026-11-24).",
    summary: `Inventory Planner (now part of Sage) describes itself as inventory planning software for retailers, e-commerce brands, wholesalers and manufacturers. Supply Chain Manager is built for distributors and wholesalers, with published monthly prices. Competitor facts on this page come from Inventory Planner's own website and were checked on ${COMPETITORS_CHECKED}.`,
    pricingSCM: `From $${STARTER_PRICE}/mo (plans sized by warehouses and SKUs)`,
    pricingCompetitor: "Not published. Its site says pricing is based on the volume of inventory you manage and asks you to request pricing.",
    keyDifferences: [
      "Published monthly plan prices, so you can see the cost before talking to anyone.",
      "Supplier on-time-in-full (OTIF) scorecards built from your own purchase order history.",
      "A single 0–100 Supply Chain Health score across inventory, suppliers, procurement, logistics and warehouses.",
      "Data importer for CSV and Excel files.",
    ],
    matrix: [
      { feature: "Starting monthly price", scm: `$${STARTER_PRICE} / month`, competitor: "Not published (request pricing)" },
      { feature: "Demand forecasting", scm: true, competitor: true },
      { feature: "Purchase order creation", scm: "Suggested orders you review and create", competitor: "Yes (claims PO automation)" },
      { feature: "Supplier OTIF scorecards", scm: true, competitor: NC, note: "Its Copilot page claims it can show overdue on-order items; an OTIF metric was not found." },
      { feature: "AI assistant", scm: true, competitor: "Yes (Sage Copilot, a claim)" },
      { feature: "CSV / Excel import", scm: true, competitor: NC, note: "Its site lists integrations; CSV import was not confirmed." },
      { feature: "Implementation", scm: "Self-serve", competitor: "Required, led by Inventory Planner (its FAQ)" },
    ],
    faq: [
      {
        question: "Why would a distributor look at Supply Chain Manager instead of Inventory Planner?",
        answer: "If you want published prices, supplier OTIF scorecards and a health score built for distributors and wholesalers, Supply Chain Manager is designed for that. Inventory Planner serves retailers, e-commerce brands, wholesalers and manufacturers and has a longer feature list in some areas. Try the live demo and compare on your own data.",
      },
      {
        question: "How do I move my data from Inventory Planner?",
        answer: "Export your products, stock levels, suppliers and purchase orders from your current system as CSV or Excel and upload them with the data importer. How long it takes depends on how clean your files are.",
      },
    ],
    sources: [
      { label: "Inventory Planner pricing", url: "https://inventory-planner.com/pricing" },
      { label: "Inventory Planner home", url: "https://inventory-planner.com/" },
      { label: "Inventory Planner purchasing features", url: "https://www.inventory-planner.com/features/purchasing/" },
      { label: "Sage Copilot for Inventory Planner", url: "https://www.inventory-planner.com/sage-copilot-for-inventory-planner/" },
    ],
  },
  "katana": {
    slug: "katana",
    name: "Katana",
    tagline: "Supply Chain Manager and Katana compared for distributors and wholesalers.",
    metaTitle: "Supply Chain Manager vs Katana (2026 Comparison)",
    metaDescription: "Supply Chain Manager vs Katana: pricing, multi-location stock, purchase orders and supplier reporting from each vendor's own site (checked 2026-11-24).",
    summary: `Katana says it is used by more than 1,600 product businesses, and its forecasting page says distributors, wholesalers, e-commerce sellers and retailers use it. Supply Chain Manager is built for distributors and wholesalers and has no manufacturing or bill-of-materials features. Competitor facts come from Katana's own website, checked on ${COMPETITORS_CHECKED}.`,
    pricingSCM: `From $${STARTER_PRICE}/mo`,
    pricingCompetitor: "Free plan ($0, up to 30 SKUs). Advantage plan: custom pricing on an annual contract.",
    keyDifferences: [
      "Built only for buying and reselling goods, with no manufacturing features.",
      "Supplier on-time-in-full (OTIF) scorecards from your purchase order history.",
      "A 0–100 Supply Chain Health score.",
      "Published monthly prices for every self-serve plan.",
    ],
    matrix: [
      { feature: "Starting price", scm: `$${STARTER_PRICE} / month`, competitor: "Free (30 SKUs); Advantage is custom" },
      { feature: "Multi-location stock", scm: true, competitor: true },
      { feature: "Reorder points and purchase orders", scm: true, competitor: true },
      { feature: "Supplier lead time and performance", scm: "OTIF scorecards", competitor: "Lead times and supplier performance tracking (a claim); on-time reporting not confirmed" },
      { feature: "AI assistant", scm: true, competitor: "Yes (AI assistant on Free; AI replenishment on Advantage)" },
      { feature: "Spreadsheet import", scm: true, competitor: true },
    ],
    faq: [
      {
        question: "Is Katana or Supply Chain Manager better for pure distribution?",
        answer: "It depends on what you need. Katana has a free plan and a wider product set. Supply Chain Manager is narrower: forecasting, reorder suggestions, supplier OTIF and a health score for distributors and wholesalers. Use the live demo to see whether that fits.",
      },
    ],
    sources: [
      { label: "Katana pricing", url: "https://katanamrp.com/pricing" },
      { label: "Katana home", url: "https://katanamrp.com/" },
      { label: "Katana purchasing", url: "https://katanamrp.com/features/purchasing/" },
      { label: "Katana planning and forecasting", url: "https://katanamrp.com/features/inventory-management/planning-and-forecasting/" },
    ],
  },
  "unleashed": {
    slug: "unleashed",
    name: "Unleashed Software",
    tagline: "Supply Chain Manager and Unleashed Software compared.",
    metaTitle: "Supply Chain Manager vs Unleashed Software (2026)",
    metaDescription: "Supply Chain Manager vs Unleashed Software. Unleashed's own site could not be read on 2026-11-24, so its details are marked not confirmed.",
    summary: `Unleashed is an inventory management product. Its website refused automated access when we checked on ${COMPETITORS_CHECKED}, so we could not read its pricing or features and have not guessed. Rows below marked "Not confirmed" should be checked on Unleashed's own site before you decide.`,
    pricingSCM: `From $${STARTER_PRICE}/mo`,
    pricingCompetitor: "Not confirmed (page could not be read)",
    keyDifferences: [
      "Daily Supply Chain Health score across inventory, suppliers, procurement, logistics and warehouses.",
      "An AI Manager that explains score changes using your own data.",
      "Free live demo with sample data, no signup.",
      "Published monthly plan prices.",
    ],
    matrix: [
      { feature: "Starting monthly price", scm: `$${STARTER_PRICE} / month`, competitor: NC },
      { feature: "Daily health score and alerts", scm: true, competitor: NC },
      { feature: "AI assistant", scm: true, competitor: NC },
      { feature: "Demand forecasting and reorder points", scm: true, competitor: NC },
      { feature: "Supplier performance analytics", scm: true, competitor: NC },
    ],
    faq: [
      {
        question: "Can I import my data from Unleashed into Supply Chain Manager?",
        answer: "If you can export your product catalog, stock levels, suppliers and purchase orders from Unleashed as CSV or Excel, you can upload them with the data importer. Check what Unleashed lets you export.",
      },
    ],
    sources: [{ label: "Unleashed Software (could not be read, HTTP 403)", url: "https://unleashedsoftware.com/" }],
  },
  "stocktrim": {
    slug: "stocktrim",
    name: "StockTrim",
    tagline: "Supply Chain Manager and StockTrim compared.",
    metaTitle: "Supply Chain Manager vs StockTrim (2026 Comparison)",
    metaDescription: "Supply Chain Manager vs StockTrim: pricing, forecasting, purchase orders and supplier reporting from each vendor's own site (checked 2026-11-24).",
    summary: `StockTrim is an inventory forecasting product for SMEs in manufacturing, wholesale, retail and e-commerce. It states unlimited users and SKUs on every plan and a 14-day free trial. Supply Chain Manager adds supplier OTIF scorecards and a health score. Competitor facts come from StockTrim's own website, checked on ${COMPETITORS_CHECKED}.`,
    pricingSCM: `From $${STARTER_PRICE}/mo`,
    pricingCompetitor: "From $49/month billed annually; the price depends on annual revenue band (its pricing page).",
    keyDifferences: [
      "Supplier on-time-in-full (OTIF) scorecards from purchase order history.",
      "A 0–100 Supply Chain Health score across five areas.",
      "Time-phased stockout projections per SKU and warehouse.",
      "Prices set by plan, not by company revenue.",
    ],
    matrix: [
      { feature: "Starting price", scm: `$${STARTER_PRICE} / month`, competitor: "$49 / month billed annually (revenue-based)" },
      { feature: "Free trial", scm: "Live demo, no signup", competitor: "14 days, no card (its site)" },
      { feature: "Demand forecasting", scm: true, competitor: true },
      { feature: "Purchase order creation", scm: "Suggested orders you review and create", competitor: true },
      { feature: "Supplier OTIF reporting", scm: true, competitor: NC, note: "It supports variable lead times as an input; lead-time performance reporting was not confirmed." },
      { feature: "Warehouse capacity metrics", scm: true, competitor: NC },
      { feature: "AI assistant", scm: true, competitor: "Yes (its site)" },
      { feature: "Users and SKUs", scm: "Limited by plan", competitor: "Unlimited on every plan (its site)" },
    ],
    faq: [
      {
        question: "What makes Supply Chain Manager different from StockTrim?",
        answer: "Supply Chain Manager adds a health score, supplier on-time-in-full scorecards and warehouse metrics on top of forecasting and reorder suggestions. StockTrim states unlimited users and SKUs on every plan, so compare costs at your own size and revenue.",
      },
    ],
    sources: [
      { label: "StockTrim pricing", url: "https://stocktrim.com/pricing" },
      { label: "StockTrim features", url: "https://stocktrim.com/features" },
    ],
  },
  "cin7": {
    slug: "cin7",
    name: "Cin7 Core",
    tagline: "Supply Chain Manager and Cin7 Core compared.",
    metaTitle: "Supply Chain Manager vs Cin7 Core (2026 Comparison)",
    metaDescription: "Supply Chain Manager vs Cin7 Core: prices, forecasting, supplier reporting and onboarding from each vendor's own site (checked 2026-11-24).",
    summary: `Cin7 Core is a broader inventory and order management product used by manufacturers, retailers, e-commerce sellers and wholesalers. Its pricing page lists Standard, Pro and Advanced plans in USD. Supply Chain Manager is narrower and focused on replenishment, supplier performance and health scoring. Competitor facts come from Cin7's own website, checked on ${COMPETITORS_CHECKED}.`,
    pricingSCM: `From $${STARTER_PRICE}/mo`,
    pricingCompetitor: "Standard $349/mo, Pro $599/mo, Advanced $1,199/mo (USD, new customers, per its pricing page).",
    keyDifferences: [
      "Narrower scope: replenishment, suppliers and health score, not a full order management system.",
      "Supplier on-time-in-full (OTIF) scorecards.",
      "Demand forecasting is part of the product, not a separate add-on.",
      "Lower entry price.",
    ],
    matrix: [
      { feature: "Starting monthly price", scm: `$${STARTER_PRICE} / month`, competitor: "$349 / month (Standard)" },
      { feature: "Demand forecasting", scm: "Included from Growth", competitor: "Add-on on all plans (its feature table)" },
      { feature: "Supplier reliability scorecards", scm: true, competitor: NC },
      { feature: "AI features", scm: "AI Manager for operational questions", competitor: "AI product descriptions listed; other AI features not confirmed" },
      { feature: "CSV / Excel import", scm: true, competitor: NC },
      { feature: "Onboarding", scm: "Self-serve", competitor: "Says up and running in four weeks (a claim)" },
    ],
    faq: [
      {
        question: "Is Supply Chain Manager an ERP?",
        answer: "No. It focuses on inventory, replenishment, supplier performance and warehouse health. It does not replace your accounting or order management system.",
      },
    ],
    sources: [
      { label: "Cin7 pricing", url: "https://www.cin7.com/pricing/" },
      { label: "Cin7 Core solution page", url: "https://www.cin7.com/solutions/core/" },
      { label: "Cin7 onboarding", url: "https://www.cin7.com/onboarding-and-support/" },
    ],
  },
  "eazystock": {
    slug: "eazystock",
    name: "EazyStock",
    tagline: "Supply Chain Manager and EazyStock compared for distributors.",
    metaTitle: "Supply Chain Manager vs EazyStock (2026 Comparison)",
    metaDescription: "Supply Chain Manager vs EazyStock: how each approaches reorder points, ERP connection and pricing, from each vendor's own site (checked 2026-11-24).",
    summary: `EazyStock is inventory optimization software that connects to your ERP, aimed at SMB wholesalers, distributors, retailers and manufacturers (its homepage). Supply Chain Manager works from CSV and Excel imports and does not require an ERP. Competitor facts come from EazyStock's own website, checked on ${COMPETITORS_CHECKED}.`,
    pricingSCM: `From $${STARTER_PRICE}/mo`,
    pricingCompetitor: "No prices published; you request a quote. Its pricing page says annual billing, with monthly billing at a 10% increase.",
    keyDifferences: [
      "Works from file imports, with no ERP connection needed to start.",
      "Published monthly plan prices.",
      "Supplier on-time-in-full (OTIF) scorecards and a health score.",
      "Try the live demo with no signup.",
    ],
    matrix: [
      { feature: "Pricing", scm: `From $${STARTER_PRICE} / month, published`, competitor: "Quote only; annual billing" },
      { feature: "Connects to your ERP", scm: "Not yet; file import", competitor: "Yes: NetSuite, Prophet 21, SAP Business One and others (its pricing FAQ)" },
      { feature: "Reorder points, order quantities, safety stock", scm: true, competitor: true },
      { feature: "Supplier order proposals", scm: "Suggested purchase orders", competitor: true },
      { feature: "Free trial", scm: "Live demo, no signup", competitor: NC },
      { feature: "Supplier OTIF scorecards", scm: true, competitor: NC },
    ],
    faq: [
      {
        question: "Which is better if I already run an ERP?",
        answer: "EazyStock lists direct connections to many ERPs, which is a real advantage if your data lives in one. Supply Chain Manager reads CSV and Excel exports instead, so it fits teams still working from spreadsheets or who prefer not to connect an ERP.",
      },
    ],
    sources: [
      { label: "EazyStock home", url: "https://www.eazystock.com/" },
      { label: "EazyStock pricing", url: "https://eazystock.com/pricing" },
    ],
  },
  "netstock": {
    slug: "netstock",
    name: "Netstock",
    tagline: "Supply Chain Manager and Netstock compared for distributors.",
    metaTitle: "Supply Chain Manager vs Netstock (2026 Comparison)",
    metaDescription: "Supply Chain Manager vs Netstock: planning scope, ERP connection and pricing, from each vendor's own site (checked 2026-11-24).",
    summary: `Netstock offers supply and demand planning that connects to more than 60 ERP systems (its pricing FAQ), for industries including wholesale, manufacturing and retail. Supply Chain Manager is smaller and works from CSV and Excel imports. Competitor facts come from Netstock's own website, checked on ${COMPETITORS_CHECKED}.`,
    pricingSCM: `From $${STARTER_PRICE}/mo`,
    pricingCompetitor: "Its FAQ says \"Pricing starts at $900/month\" on an annual subscription. The currency is not stated.",
    keyDifferences: [
      "Much lower entry price, with published plans.",
      "Self-serve start from file imports.",
      "Supplier OTIF scorecards and a health score.",
      "No ERP connection is needed to try it.",
    ],
    matrix: [
      { feature: "Starting price", scm: `$${STARTER_PRICE} / month`, competitor: "$900 / month, annual (currency not stated)" },
      { feature: "Connects to your ERP", scm: "Not yet; file import", competitor: "Yes, 60+ ERPs (its FAQ, a claim)" },
      { feature: "Demand planning and forecasting", scm: true, competitor: true },
      { feature: "Sales and operations planning (S&OP)", scm: false, competitor: "Yes (its homepage)" },
      { feature: "Supplier performance", scm: "OTIF scorecards", competitor: "Listed on its homepage" },
      { feature: "Free trial", scm: "Live demo, no signup", competitor: NC },
      { feature: "Implementation time", scm: "Self-serve", competitor: "6–10 weeks (its FAQ)" },
    ],
    faq: [
      {
        question: "Is Netstock or Supply Chain Manager right for a small distributor?",
        answer: "Netstock is a broader planning suite for companies that run an ERP and need S&OP. Supply Chain Manager is smaller and cheaper to start, but it has fewer integrations and no S&OP. Compare against what you actually need.",
      },
    ],
    sources: [
      { label: "Netstock home", url: "https://netstock.com/" },
      { label: "Netstock pricing", url: "https://www.netstock.com/pricing/" },
    ],
  },
};
