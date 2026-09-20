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
}

export const COMPETITORS: Record<string, CompetitorData> = {
  "inventory-planner": {
    slug: "inventory-planner",
    name: "Inventory Planner",
    tagline: "The modern alternative to Inventory Planner built specifically for wholesale distributors.",
    metaTitle: "Supply Chain Manager vs Inventory Planner (2026 Comparison)",
    metaDescription: "Comparing Supply Chain Manager vs Inventory Planner. Discover why distributors choose Supply Chain Manager for demand forecasting, supplier OTIF tracking, and transparent pricing.",
    summary: "Inventory Planner is built primarily for e-commerce brands and charges steep fees based on SKU counts and connected stores. Supply Chain Manager provides demand forecasting, lead-time tracking, and automated purchase order generation tailored for wholesale distributors at a transparent fixed price.",
    pricingSCM: "From $49/mo (Flat pricing)",
    pricingCompetitor: "From $249+/mo (SKU-tiered pricing)",
    keyDifferences: [
      "Transparent, fixed monthly pricing without surprise fees for growing SKU catalogs.",
      "Integrated Supplier Health & OTIF tracking directly tied to lead-time warnings.",
      "Built-in AI Manager for natural language operational queries and instant answers.",
      "Faster onboarding — drop messy spreadsheets and get instant health scores.",
    ],
    matrix: [
      { feature: "Starting Monthly Price", scm: "$49 / month", competitor: "$249+ / month" },
      { feature: "Demand Forecasting Engine", scm: true, competitor: true },
      { feature: "Supplier OTIF & Performance Scorecards", scm: true, competitor: false, note: "Inventory Planner focuses primarily on sales forecasting" },
      { feature: "AI Operations Assistant", scm: true, competitor: false },
      { feature: "Time-Phased Stockout Sawtooth Charts", scm: true, competitor: true },
      { feature: "1-Click Suggested Purchase Orders", scm: true, competitor: true },
      { feature: "Instant CSV/Excel Importer", scm: true, competitor: "Requires API integrations" },
    ],
    faq: [
      {
        question: "Why switch from Inventory Planner to Supply Chain Manager?",
        answer: "Distributors switch to Supply Chain Manager to avoid unpredictable SKU-based pricing, track supplier lead-time delays (OTIF), and use an intuitive operational dashboard that works directly from spreadsheet imports.",
      },
      {
        question: "How long does migration from Inventory Planner take?",
        answer: "Migration takes minutes. Simply export your CSV data (products, stock levels, suppliers, and purchase orders) and upload it into Supply Chain Manager.",
      },
    ],
  },
  "katana": {
    slug: "katana",
    name: "Katana Cloud Manufacturing",
    tagline: "Distributor-focused alternative to Katana MRP without manufacturing overhead.",
    metaTitle: "Supply Chain Manager vs Katana MRP (2026 Comparison)",
    metaDescription: "Comparing Supply Chain Manager vs Katana Cloud Manufacturing. See why non-manufacturing wholesale distributors choose Supply Chain Manager.",
    summary: "Katana MRP is built for shop-floor manufacturing and bill-of-materials (BOM) management. If you are a distributor or wholesaler buying and reselling finished goods, Katana adds unnecessary complexity. Supply Chain Manager streamlines distribution, supplier OTIF tracking, and reorder projections.",
    pricingSCM: "From $49/mo",
    pricingCompetitor: "From $359+/mo",
    keyDifferences: [
      "Purpose-built for distribution networks rather than shop-floor assembly.",
      "Advanced supplier reliability & OTIF cycle-time tracking.",
      "Far lower starting cost without paying for unwanted manufacturing modules.",
      "Conversational AI Manager for grounded operational insights.",
    ],
    matrix: [
      { feature: "Starting Monthly Price", scm: "$49 / month", competitor: "$359+ / month" },
      { feature: "Wholesale & Distribution Focus", scm: true, competitor: false, note: "Katana is designed for shop-floor manufacturing" },
      { feature: "Supplier Lead Time & OTIF Analytics", scm: true, competitor: false },
      { feature: "Multi-Warehouse Stock Reordering", scm: true, competitor: true },
      { feature: "AI Assistant Grounded in Data", scm: true, competitor: false },
      { feature: "Spreadsheet & CSV Import Engine", scm: true, competitor: true },
    ],
    faq: [
      {
        question: "Is Katana or Supply Chain Manager better for pure distribution?",
        answer: "Supply Chain Manager is purpose-built for pure distribution. If you don't manufacture or assemble goods on a shop floor, Supply Chain Manager gives you cleaner forecasting, supplier scorecards, and lower pricing.",
      },
    ],
  },
  "unleashed": {
    slug: "unleashed",
    name: "Unleashed Software",
    tagline: "Modern, agile supply chain management without complex legacy menus.",
    metaTitle: "Supply Chain Manager vs Unleashed Software (2026 Comparison)",
    metaDescription: "Comparing Supply Chain Manager vs Unleashed Software. Discover the modern alternative for inventory, procurement, and forecasting.",
    summary: "Unleashed is a feature-rich legacy inventory tool, but its complex navigation and slow reporting can slow down daily operations. Supply Chain Manager offers a modern, high-speed interface with daily health scores, AI-assisted querying, and instant stockout projections.",
    pricingSCM: "From $49/mo",
    pricingCompetitor: "From $349+/mo",
    keyDifferences: [
      "Modern, fast user interface with sub-second page loads.",
      "Daily automated health scoring across Inventory, Procurement, Logistics, and Warehouses.",
      "AI Manager capable of explaining score drops and recommending PO pull-forwards.",
      "14-day free trial with no credit card required.",
    ],
    matrix: [
      { feature: "Starting Monthly Price", scm: "$49 / month", competitor: "$349+ / month" },
      { feature: "Modern Fast Interface", scm: true, competitor: false, note: "Unleashed relies on multi-tab legacy menus" },
      { feature: "Daily Health Score & Alerts", scm: true, competitor: false },
      { feature: "AI Manager Assistant", scm: true, competitor: false },
      { feature: "Demand Forecasting & Reorder Point Calculation", scm: true, competitor: true },
      { feature: "Supplier Performance Analytics", scm: true, competitor: true },
    ],
    faq: [
      {
        question: "Can I import my data from Unleashed into Supply Chain Manager?",
        answer: "Yes! You can export your product catalog, warehouse stock levels, suppliers, and purchase orders from Unleashed to CSV or Excel and import them into Supply Chain Manager in one flow.",
      },
    ],
  },
  "stocktrim": {
    slug: "stocktrim",
    name: "StockTrim",
    tagline: "Comprehensive supply chain intelligence with integrated supplier scorecards.",
    metaTitle: "Supply Chain Manager vs StockTrim (2026 Comparison)",
    metaDescription: "Comparing Supply Chain Manager vs StockTrim. See why operations teams prefer Supply Chain Manager for complete visibility.",
    summary: "While StockTrim focuses heavily on inventory calculations, Supply Chain Manager combines stockout forecasting with end-to-end operational metrics: supplier OTIF reliability, warehouse space utilization, procurement spend analysis, and an AI Operations Manager.",
    pricingSCM: "From $49/mo",
    pricingCompetitor: "From $99+/mo",
    keyDifferences: [
      "Complete 360° visibility: Inventory, Suppliers, Procurement, Logistics, and Warehouses.",
      "Deterministic AI Manager to answer operational questions in plain language.",
      "Visual time-phased sawtooth stockout charts.",
      "Generous SKU and warehouse limits on every pricing tier.",
    ],
    matrix: [
      { feature: "Starting Monthly Price", scm: "$49 / month", competitor: "$99+ / month" },
      { feature: "Demand Forecasting", scm: true, competitor: true },
      { feature: "Supplier OTIF & Lead-Time Analysis", scm: true, competitor: false },
      { feature: "Warehouse Capacity & Utilization Metrics", scm: true, competitor: false },
      { feature: "Grounded AI Manager", scm: true, competitor: false },
      { feature: "1-Click PO Creation", scm: true, competitor: true },
    ],
    faq: [
      {
        question: "What makes Supply Chain Manager different from StockTrim?",
        answer: "Supply Chain Manager goes beyond simple stock level calculations by rating overall supply chain health, measuring supplier lead-time performance, and providing an AI Manager to investigate operational bottlenecks.",
      },
    ],
  },
  "cin7": {
    slug: "cin7",
    name: "Cin7 Core / DEAR",
    tagline: "Agile, distributor-first supply chain software without ERP complexity.",
    metaTitle: "Supply Chain Manager vs Cin7 Core / DEAR (2026 Comparison)",
    metaDescription: "Comparing Supply Chain Manager vs Cin7 Core. Find out why growing distributors pick Supply Chain Manager.",
    summary: "Cin7 Core (formerly DEAR Inventory) is a broad mid-market ERP system that requires months of setup and costly implementation partners. Supply Chain Manager focuses on core supply chain execution — forecasting, reordering, supplier tracking — and gets you up and running in an afternoon.",
    pricingSCM: "From $49/mo",
    pricingCompetitor: "From $325+/mo",
    keyDifferences: [
      "Set up in an afternoon instead of months of ERP consulting.",
      "Clear, upfront pricing with no long-term contracts.",
      "Dedicated supplier lead-time warning banners and scorecards.",
      "Lightweight, lightning-fast web dashboard.",
    ],
    matrix: [
      { feature: "Starting Monthly Price", scm: "$49 / month", competitor: "$325+ / month" },
      { feature: "Setup Time", scm: "1 Afternoon", competitor: "1 - 3 Months" },
      { feature: "Demand Forecasting & Safety Stock", scm: true, competitor: true },
      { feature: "Supplier Reliability Scorecards", scm: true, competitor: false },
      { feature: "AI Assistant", scm: true, competitor: false },
      { feature: "Self-Serve CSV Data Importer", scm: true, competitor: false },
    ],
    faq: [
      {
        question: "Is Supply Chain Manager an ERP?",
        answer: "Supply Chain Manager is a focused supply chain execution and forecasting platform. It handles inventory forecasting, procurement, supplier tracking, and warehouse health without the bloated cost and complexity of a full ERP.",
      },
    ],
  },
};
