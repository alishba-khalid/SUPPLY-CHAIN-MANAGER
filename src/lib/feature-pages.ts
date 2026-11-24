import type { Inline } from "@/lib/blog/posts";

/**
 * Feature pages (/features/<slug>). Every statement about the product was
 * checked against the code on 2026-11-24; the file or function it rests on is
 * named in the comment above each page. Same honesty rules as the blog and
 * glossary: nothing the app cannot do today, limits stated plainly. When the
 * code changes, re-check the page and move `updated` (the sitemap reads it).
 */

export interface FeatureSection {
  title: string;
  paragraphs?: Inline[][];
  bullets?: Inline[][];
  table?: { head: string[]; rows: string[][] };
  formula?: string[];
}

export interface FeaturePageData {
  slug: string;
  /** <title>; at most 60 characters. */
  metaTitle: string;
  /** Meta description; at most 160 characters. */
  description: string;
  badge: string;
  h1: string;
  lead: string;
  updated: string; // YYYY-MM-DD
  sections: FeatureSection[];
  /** What it does not do. */
  limits: Inline[][];
  faq: { q: string; a: Inline[] }[];
  guides: string[];
  terms: string[];
}

const U = "2026-11-24";
const gl = (slug: string, text: string): Inline => ({ href: `/glossary/${slug}`, text });
const pg = (href: string, text: string): Inline => ({ href, text });

export const FEATURE_PAGES: Record<string, FeaturePageData> = {
  // Checked: src/lib/forecasting/demand-forecast.ts, projections pages, forecast-mode-badge.tsx,
  // api/cron/recompute-forecasts.
  "stockout-projections": {
    slug: "stockout-projections",
    metaTitle: "Stockout Projection Software for Distributors",
    description:
      "See when each SKU is projected to run out, per warehouse, with open purchase orders counted and a clear reorder, expedite or transfer call.",
    badge: "Stockout projections",
    h1: "Stockout projections for every SKU and warehouse",
    lead: "A day-by-day projection of each SKU's stock at each warehouse, showing the day it is expected to run out, what open purchase orders will change, and what to do about it.",
    updated: U,
    sections: [
      {
        title: "What the projection shows",
        paragraphs: [
          [
            "For every SKU at every warehouse, the projection walks the stock balance forward one day at a time. It starts from the quantity on hand, takes off the expected daily demand, and steps the balance back up on the date each open purchase order is expected to arrive. The result is a sawtooth chart: stock falling, a delivery, stock falling again.",
          ],
          [
            "Two dates matter most. The first is the day the balance is projected to reach zero. The second is the date stock is covered through. If a purchase order is on its way but the stock runs out before it lands, the projection shows the gap in days, so you can see the difference between a stockout that a delivery fixes and one that it arrives too late for.",
          ],
        ],
      },
      {
        title: "How each projection is built",
        bullets: [
          ["Demand: a trimmed daily average from the trailing 90 days of outbound movement, which drops the top and bottom 5% of active sales days so a one-off bulk order does not distort the pace. See ", gl("average-daily-demand", "average daily demand"), "."],
          ["Weekday pattern: demand is adjusted by a day-of-week multiplier learned from the same history, so a SKU that sells mostly on weekdays is not drained evenly across weekends."],
          ["Incoming stock: open purchase orders raise the balance on their expected date. An order that is already past its expected date with nothing received is not counted, because there is no evidence the units are on the way. It is listed as overdue instead."],
          ["Horizon: the projection looks ahead by the supplier's lead time plus half again (and at least 3 days), with a minimum of 14 days, which is how far today's order decisions can still change the outcome."],
          ["Safety stock and target: the target stock is demand over the lead time plus one review day, plus a safety buffer sized for a 95% service level. See ", gl("service-level", "service level"), "."],
        ],
      },
      {
        title: "What the action labels mean",
        table: {
          head: ["Label", "When it appears", "What it suggests"],
          rows: [
            ["Expedite", "Stock runs out before the next open purchase order arrives, and no other warehouse can cover the gap", "Chase or speed up the order already placed"],
            ["Transfer", "Same gap, but another warehouse holds enough surplus above its own target stock and a safety margin to cover it", "Move stock between sites"],
            ["Reorder", "No gap before the next delivery, but the projected ending position is below the target stock", "Raise a new purchase order for the shortfall"],
            ["Covered", "The projected balance stays at or above target through the horizon", "Nothing to do now"],
          ],
        },
        paragraphs: [
          [
            "The suggested quantity is the target stock minus what is on hand minus what is already inbound. The order screen shows the working behind it: the demand pace, lead time, spread of demand, safety stock, and each inbound order counted or excluded.",
          ],
        ],
        formula: ["Target stock = daily demand × (lead time + 1 review day) + safety stock", "Suggested quantity = target stock − on hand − inbound orders"],
      },
      {
        title: "Reading the projections grid",
        paragraphs: [
          [
            "The grid lists every SKU and warehouse position sorted by days until stockout, worst first, so the top of the list is the work for today. You can filter by warehouse, by supplier, and by action. Each row carries its ABC and XYZ class, so a risk on a high-value, steady item stands out from one on a slow, erratic one. A badge shows whether the forecasts behind the view are the statistical ones or the fallback.",
          ],
          [
            "Forecasts are computed in a nightly batch and the page reads the stored results, which keeps it fast. Recompute them on demand after a large data import.",
          ],
        ],
      },
    ],
    limits: [
      ["It projects from your history. It does not know about a planned promotion, a new customer or a price change unless the sales data already shows them."],
      ["Only weekly patterns are modelled. A yearly season is not, so check seasonal SKUs yourself before the peak."],
      ["The horizon is short by design (lead time plus a margin). It is not a months-ahead plan."],
      ["It depends on honest dates. A purchase order with no expected date, or a supplier with no lead time, makes the result less reliable, and the page flags a missing lead time rather than inventing one."],
      ["Projections show what to do. They do not place orders or move stock for you."],
    ],
    faq: [
      {
        q: "How far ahead does the projection look?",
        a: ["For each SKU it looks ahead the supplier's lead time plus half again, and never less than 14 days. That is the window in which a decision today can still prevent a stockout."],
      },
      {
        q: "Does it count orders that are late?",
        a: ["No. A purchase order past its expected date with no receipt is shown as overdue and left out of the projected balance, so a late supplier cannot make a stockout look covered."],
      },
      {
        q: "What happens if a SKU has little history?",
        a: ["The demand rate is divided by the days of history the SKU actually has, not by 90, and the forecasting service falls back to a simple trailing average when it cannot be reached. Treat projections for new SKUs as rough."],
      },
    ],
    guides: ["reorder-expedite-or-transfer", "reorder-point-formula"],
    terms: ["days-of-supply", "stockout", "lead-time", "inventory-transfer", "forecast-accuracy"],
  },

  // Checked: src/lib/metrics/health.ts, inventory.ts, supplier.ts, procurement.ts, logistics.ts, warehouse.ts.
  "supply-chain-health-score": {
    slug: "supply-chain-health-score",
    metaTitle: "Supply Chain Health Score: How It Is Calculated",
    description:
      "One 0 to 100 score from five weighted parts: inventory, suppliers, procurement, logistics and warehouses. See the formula, bands and limits.",
    badge: "Health score",
    h1: "The Supply Chain Health score, explained",
    lead: "A single number from 0 to 100 that rolls up five areas of your operation. Each part stays visible on its own so you can see what is pulling the score down.",
    updated: U,
    sections: [
      {
        title: "The five parts and their weights",
        table: {
          head: ["Part", "Weight", "What it measures"],
          rows: [
            ["Inventory", "30%", "The average of each stocked position's status: healthy 100, overstock 75, slow-moving 70, low stock 60, no demand 40, stock-out risk 10"],
            ["Suppliers", "20%", "The share of purchase orders delivered by their expected date over the trailing 90 days, including open orders already overdue, weighted by how much you spend with each supplier"],
            ["Procurement", "20%", "70% purchase order timeliness (counted twice, as order fulfilment and cycle time) and 30% price stability against each product's baseline unit cost"],
            ["Logistics", "20%", "Inbound delivery timeliness, the share of purchase orders received by their expected date"],
            ["Warehouses", "10%", "Half capacity utilization (100 inside a 70 to 90% band) and half the share of positions in healthy status"],
          ],
        },
        paragraphs: [
          [
            "The overall score is the weighted average of the parts, rounded to a whole number. Each part is calculated from your own imported data. Nothing is a benchmark against other companies.",
          ],
        ],
      },
      {
        title: "Reading the bands",
        bullets: [
          ["80 and above is healthy."],
          ["60 to 79 needs attention."],
          ["Below 60 is critical."],
        ],
        paragraphs: [
          [
            "The same bands colour the score cards and decide which items appear in the attention list. They are rules of thumb built into the app, not industry standards, so use the trend and the individual parts more than the exact threshold.",
          ],
        ],
      },
      {
        title: "When data is missing",
        paragraphs: [
          [
            "A part with no data is left out, not scored as zero, and the remaining weights are rescaled to add up to 100%. If no supplier has delivered or been overdue in the last 90 days, the supplier part is unknown. If no warehouse has a capacity entered, the warehouse part is unknown. The app shows these as unknown rather than inventing a figure, which also means a score built from fewer parts says less.",
          ],
        ],
      },
      {
        title: "What drives the score most",
        paragraphs: [
          [
            "Purchase order timeliness feeds three of the five parts: suppliers, most of procurement, and logistics. Together they carry more than half of the score when all parts are present, so a run of late orders moves the number far more than a change in capacity. That is useful if supplier reliability is your biggest risk and misleading if it is not, so look at the parts before drawing a conclusion. Inventory, at 30%, is the other large driver, and it responds to the stock decisions you make every day. See ",
            pg("/features/stockout-projections", "stockout projections"),
            " for the item-level view behind it.",
          ],
        ],
      },
    ],
    limits: [
      ["The supplier score measures timeliness only. The app does not record the quantity received, so it cannot see short shipments. See the " , pg("/features/supplier-scorecards", "supplier scorecards"), " page."],
      ["Logistics is inbound purchase order timeliness, because the app has no shipment or outbound delivery data. It overlaps with the supplier and procurement parts."],
      ["Warehouse capacity needs you to enter a capacity per warehouse. Without it the warehouse part is unknown."],
      ["An average can hide a single serious problem. One critical SKU does not move a score built from thousands of positions, so use the attention list as well."],
      ["The score is not a prediction and not a benchmark."],
    ],
    faq: [
      {
        q: "Can I change the weights or thresholds?",
        a: ["No. The weights and the 80 and 60 bands are fixed in the app today."],
      },
      {
        q: "Why is a part shown as unknown?",
        a: ["Because there was nothing to measure, for example no supplier deliveries in the last 90 days. An unknown part is excluded and the other weights are rescaled."],
      },
      {
        q: "How often does the score update?",
        a: ["It is calculated from the data in the app, so it follows your latest import or refresh."],
      },
    ],
    guides: ["supplier-otif", "overstock-vs-dead-stock"],
    terms: ["on-time-delivery-rate", "inventory-turnover", "days-of-supply", "lead-time", "cycle-counting"],
  },

  // Checked: src/lib/importer/*, src/components/domain/smart-importer/*, data-importer.tsx, tiers.ts.
  "data-importer": {
    slug: "data-importer",
    metaTitle: "Import Inventory Data from Excel and CSV",
    description:
      "Load stock, suppliers, products and purchase orders from Excel or CSV. Bad rows are rejected with a reason, and blanks are never turned into zeros.",
    badge: "Data importer",
    h1: "Import your inventory data from Excel or CSV",
    lead: "No integration project: export from your ERP, accounting package or spreadsheet, upload the files, and check what was accepted and what was not.",
    updated: U,
    sections: [
      {
        title: "Two ways to load data",
        paragraphs: [
          [
            "The template import takes six files that match the app's own layout: warehouses, suppliers, products, inventory, purchase orders and transactions. It is the most predictable route and the one used for repeat loads.",
          ],
          [
            "The smart importer is for files in someone else's layout. It reads a workbook, proposes which of your columns map to which fields, lets you correct the mapping, suggests merges for near-duplicate names, shows a preview, and then imports. Both routes use the same row rules.",
          ],
        ],
      },
      {
        title: "What the six files hold",
        table: {
          head: ["File", "What it carries"],
          rows: [
            ["Warehouses", "Code, name and optional capacity in units"],
            ["Suppliers", "Supplier ID, name, lead time in days, contact email"],
            ["Products", "SKU, name, category, unit cost, assigned supplier"],
            ["Inventory", "SKU, warehouse code, quantity on hand"],
            ["Purchase orders", "PO number, supplier, SKU, quantity, unit price, order, expected and received dates"],
            ["Transactions", "SKU, warehouse code, quantity, direction in or out, date"],
          ],
        },
        paragraphs: [
          [
            "Transactions are the sales and movement history that every demand figure is built from, so the quality of that file matters most. Aim for at least 90 days.",
          ],
        ],
      },
      {
        title: "Rules that protect your data",
        bullets: [
          ["A row with a blank or invalid quantity, price, cost or date is rejected with a message such as 'Row 12, column unit_cost: not a number'. It never becomes 0 or today's date."],
          ["Optional values you leave blank are saved as unknown, not as placeholders. A warehouse with no capacity has an unknown capacity, and a supplier with no lead time is flagged as missing one."],
          ["Re-importing is safe: transaction keys stop the same movement being counted twice, so a refreshed file does not duplicate history."],
          ["Supplier names are compared after stripping legal suffixes and punctuation, so 'Acme Ltd.' and 'ACME' are offered as a merge, and you decide."],
        ],
      },
      {
        title: "Formats and limits",
        bullets: [
          ["Files: .xlsx, .xlsm, .csv and .tsv. Every sheet in a workbook is read."],
          ["Rows per import depend on the plan: 100,000 on Starter, 500,000 on Growth, 2,000,000 on Professional and Enterprise, and 50,000 in the demo or trial."],
          ["Large files are uploaded in chunks of up to 2,000 rows, so a long import shows its progress."],
          ["Adding your own data needs a paid plan. The demo runs on sample data and treats imports as simulations."],
        ],
      },
    ],
    limits: [
      ["The importer reads values as a single base unit per SKU. It does not convert cases to eaches, so convert units in the file first. See " , gl("sku", "SKU and unit of measure"), "."],
      ["It does not store the quantity received on a purchase order, only the received date."],
      ["It does not connect to your ERP. Data arrives by file, or by an " , pg("/features/automatic-data-refresh", "automatic refresh of a saved link"), "."],
      ["Quality in is quality out. A stock figure that is wrong in your system will be wrong here, so a recent count before the first import helps."],
    ],
    faq: [
      {
        q: "Do I need to reformat my files?",
        a: ["Not necessarily. The smart importer maps your columns to the app's fields and lets you fix its guesses. The template route is stricter and best once you know the layout."],
      },
      {
        q: "What happens to rows that fail?",
        a: ["They are listed with the row, the column and the reason, and the rest of the file continues. Nothing is silently changed."],
      },
      {
        q: "Can I import more than once?",
        a: ["Yes. Re-imports do not duplicate the transaction history, and a refresh never deletes existing data."],
      },
    ],
    guides: ["reorder-point-formula", "safety-stock-formula"],
    terms: ["sku", "average-daily-demand", "quantity-on-hand", "purchase-order", "lead-time"],
  },

  // Checked: src/lib/sync/*, src/components/domain/data-sources.tsx, api/cron/refresh-data-sources,
  // .github/workflows/cron.yml. Confirm the feature is switched on in production before publishing.
  "automatic-data-refresh": {
    slug: "automatic-data-refresh",
    metaTitle: "Automatic Refresh from Google Sheets or OneDrive",
    description:
      "Keep a Google Sheet, OneDrive workbook or CSV link as your source and have it re-imported daily with the same checks as a manual import.",
    badge: "Automatic refresh",
    h1: "Keep your data fresh from a saved link",
    lead: "Point the app at a Google Sheet, OneDrive or SharePoint workbook, or a public CSV link, and it re-imports the file every day or whenever you ask.",
    updated: U,
    sections: [
      {
        title: "How it works",
        paragraphs: [
          [
            "You save a link once, choose a source type, and choose whether it refreshes every day or only when you ask. The app downloads the file from that link, checks the headers, and runs the rows through the same import as a manual upload. The result of each refresh, including any rejected rows, is recorded against the link.",
          ],
          [
            "This suits teams whose source of truth is a spreadsheet that someone already updates. The planning screens then follow that spreadsheet without anyone uploading files by hand.",
          ],
          [
            "Setting it up takes a few minutes. Under Import, open Automatic refresh, choose the source type, paste the link, name it, and pick the schedule. The file should use the same layout as the import templates, since that is what the checks expect. Run one manual import first so you know the file's columns pass, then let the daily refresh keep it current.",
          ],
        ],
      },
      {
        title: "Supported links",
        table: {
          head: ["Source", "Link must come from", "Notes"],
          rows: [
            ["Google Sheets", "docs.google.com", "Use a publish-to-web or share link; it is converted to a direct download"],
            ["OneDrive and SharePoint", "onedrive.live.com, 1drv.ms or sharepoint.com", "The workbook must be shared as a link"],
            ["CSV link", "Any public https address", "Plain https link to a CSV file"],
          ],
        },
      },
      {
        title: "Safety checks built in",
        bullets: [
          ["Only https links are accepted, and links with a username, password or custom port are refused."],
          ["Links that point at local or private network addresses are blocked, and redirects are checked at every hop."],
          ["Each download has a 15-second timeout and a 10 MB size cap."],
          ["A refresh never clears existing data. Rows deleted from the sheet stay in the app, and re-imports do not duplicate transactions."],
          ["Workspaces without an active plan are skipped, with a note saying why."],
        ],
      },
      {
        title: "What a refresh is and is not",
        paragraphs: [
          [
            "A refresh adds and updates. It is the same as uploading the file again, so it follows the same row rules: invalid rows are rejected with a reason and blanks are never turned into zeros. See the ",
            pg("/features/data-importer", "data importer"),
            " page for the rules. Because deleted rows are kept, remove a SKU in the app or tell the importer explicitly when something should no longer exist.",
          ],
        ],
      },
    ],
    limits: [
      ["Up to 50,000 rows and 10 MB per refresh, the same ceiling as the demo and trial import."],
      ["The schedule is daily or manual. There is no more frequent option."],
      ["Private sheets that need a login cannot be read. The link must be shareable without signing in."],
      ["It copies a file into the app. It is not a live connection to your ERP, and it does not write back to your sheet."],
      ["Changes made after the daily run appear at the next one unless you press Refresh now."],
    ],
    faq: [
      {
        q: "How often does it refresh?",
        a: ["Every day if you choose that, or only when you press Refresh now."],
      },
      {
        q: "Will a refresh overwrite my data?",
        a: ["It updates records and adds new ones using the manual-import rules. It does not delete anything that has disappeared from the sheet."],
      },
      {
        q: "What happens if the link breaks?",
        a: ["The refresh fails with a message and the existing data stays as it was. Fix the link and run it again."],
      },
    ],
    guides: ["reorder-point-formula", "safety-stock-formula"],
    terms: ["average-daily-demand", "quantity-on-hand", "sku", "purchase-order", "lead-time"],
  },

  // Checked: demand-forecast.ts (donor guard), metrics/warehouse.ts, tiers.ts, projections and warehouses pages.
  "multi-warehouse-planning": {
    slug: "multi-warehouse-planning",
    metaTitle: "Multi-Warehouse Inventory Planning Software",
    description:
      "Plan each warehouse on its own demand, see capacity use, and get transfer suggestions when one site is short and another holds surplus.",
    badge: "Multi-warehouse",
    h1: "Plan every warehouse on its own numbers",
    lead: "Stock in one building cannot fill an order due in another. The app plans each SKU at each warehouse separately and looks across sites for surplus.",
    updated: U,
    sections: [
      {
        title: "Per-warehouse, not company-wide",
        paragraphs: [
          [
            "Demand, days of stock, safety stock, reorder point and projection are all calculated for each SKU at each warehouse. A product can sell quickly at one site and barely move at another, and a company-wide average hides both. A stockout at one warehouse while another holds plenty is still a stockout for the customer it was meant to serve.",
          ],
          [
            "Every list can be filtered by warehouse, and the warehouses page shows each site's capacity use and the share of its positions that are in healthy status.",
          ],
        ],
      },
      {
        title: "How transfer suggestions are decided",
        paragraphs: [
          [
            "When a position is projected to run out before its next purchase order arrives, the app checks the same SKU at your other warehouses for a donor. A site only qualifies if, after covering its own target stock, it still has a surplus of at least 20% of that target and at least 10 units or about $50 of value. The surplus must also cover the shortfall for the length of the gap. If a donor qualifies, the suggestion is a transfer. If not, it is an expedite.",
          ],
          [
            "The guard against emptying the donor is the important part. Without it, a transfer just moves the stockout somewhere else. See ",
            pg("/blog/reorder-expedite-or-transfer", "reorder, expedite or transfer"),
            " for how to weigh the options.",
          ],
        ],
        formula: ["Donor surplus = donor on hand − (donor demand × (lead time + 1) + donor safety stock)"],
      },
      {
        title: "Capacity and warehouse health",
        paragraphs: [
          [
            "If you enter a capacity in units for a warehouse, the app shows its utilization. Between 70% and 90% counts as healthy, below 70% as underused and above 90% as at risk. The warehouse score blends utilization with the share of positions in healthy status. A warehouse with no capacity entered is shown as unknown, not as zero.",
          ],
        ],
      },
      {
        title: "Warehouses per plan",
        table: {
          head: ["Plan", "Warehouses", "Transfer suggestions"],
          rows: [
            ["Starter", "1", "Not applicable"],
            ["Growth", "Up to 3", "Not listed as a plan feature"],
            ["Professional", "Up to 12", "Listed as a plan feature"],
            ["Enterprise", "Unlimited", "Included"],
          ],
        },
        paragraphs: [
          ["Warehouse and SKU counts show what each plan is sized for. See " , pg("/pricing", "pricing"), " for current plans."],
        ],
      },
    ],
    limits: [
      ["Transfers are suggestions. The app does not create transfer orders, track stock in transit between sites, or record that a move happened. Update your own system and re-import."],
      ["A transfer reduces the sending site's stock only once you import that movement."],
      ["It does not model freight cost or transfer time. Compare those yourself before moving stock."],
      ["Third-party warehouses can be planned like your own if you load their stock, but their fees are not modelled."],
    ],
    faq: [
      {
        q: "Does it recommend moving stock between warehouses?",
        a: ["Yes, as a suggestion when one site is projected to run short and another holds enough surplus after covering its own needs. You carry out the move yourself."],
      },
      {
        q: "Can I plan a third-party warehouse?",
        a: ["If you can supply its stock and movement data, it is planned like any other location. See the glossary entry on third-party logistics for the cost side."],
      },
      {
        q: "What if a warehouse has no capacity entered?",
        a: ["Its capacity part is shown as unknown and left out of the warehouse score, and the other warehouse figures still work."],
      },
    ],
    guides: ["reorder-expedite-or-transfer", "overstock-vs-dead-stock"],
    terms: ["inventory-transfer", "days-of-supply", "cycle-stock", "third-party-logistics", "quantity-on-hand"],
  },

  // Checked: src/app/actions/ai-manager.ts (deterministic keyword matching, not an LLM),
  // ai-manager-view.tsx.
  "ai-manager": {
    slug: "ai-manager",
    metaTitle: "AI Manager: Ask Questions of Your Own Data",
    description:
      "A question box that answers from your own stock, supplier and health data. It is rule-based, not a generative AI, and says so.",
    badge: "AI Manager",
    h1: "Ask your data a question",
    lead: "The AI Manager is a question box on the dashboard. It answers from the figures already in your workspace and points to the screen where you can act.",
    updated: U,
    sections: [
      {
        title: "What it is, plainly",
        paragraphs: [
          [
            "The AI Manager is deliberately not a large language model. It reads your question, matches it against a small set of topics, and fills in an answer from your own live numbers. Because every answer is built from your data by fixed rules, it cannot invent a supplier, a SKU or a figure that is not in your workspace, and the same question on the same data gives the same answer.",
          ],
          [
            "That is a trade. It will not hold a conversation, follow up on its last answer, or reason about a question outside the topics below. If you want free-form analysis, this is not it. If you want a quick, reliable read of the current position without opening four screens, it is.",
          ],
        ],
      },
      {
        title: "What it can answer",
        table: {
          head: ["Ask about", "It answers with", "It links to"],
          rows: [
            ["Stockouts, risk or low stock", "How many stockout or low-stock alerts are open and the most urgent one", "Low stock in Inventory"],
            ["Suppliers, delivery or OTIF", "The supplier and procurement scores for the last 90 days of purchase orders, or that there is no data yet", "Supplier scorecards"],
            ["Overstock or capital tied up", "The overstock alert, which states how many positions are over their threshold and the capital tied up", "Overstock in Inventory"],
            ["Anything else", "An overview of overall, inventory and logistics health scores", "The analytics overview"],
          ],
        },
        paragraphs: [
          [
            "Every reply ends with a suggested action and a link, for example 'Open Supplier Scorecards', so the answer leads to the screen where the work is done. The quick prompts above the box cover the four topics.",
          ],
        ],
      },
      {
        title: "Why this design",
        bullets: [
          ["Grounded: every number comes from your workspace at the moment you ask."],
          ["Predictable: same data, same answer, so it is easy to trust and to explain to a colleague."],
          ["Private by construction: no question or data is sent to an outside language model."],
          ["Safe to approve: it surfaces and explains, and it never places an order. You approve every action."],
        ],
      },
      {
        title: "Quotas and the demo",
        paragraphs: [
          [
            "In the public demo, questions are capped per visitor and per day to keep the demo available. In a paid workspace the plan shows a monthly question allowance on the AI Manager screen.",
          ],
        ],
      },
    ],
    limits: [
      ["It is rule-based, not generative AI. It recognizes four topics by keywords in your question."],
      ["It does not remember earlier messages and cannot answer follow-up questions."],
      ["It cannot answer questions about a specific SKU, supplier or customer by name. Use the filters on the Inventory and Suppliers screens for that."],
      ["Its supplier answer measures purchase order timeliness only, because the app does not record received quantities."],
      ["It does not place orders or change data."],
    ],
    faq: [
      {
        q: "Is the AI Manager ChatGPT or a similar model?",
        a: ["No. It does not use a language model. It matches your question to a topic and builds the reply from your own data with fixed rules."],
      },
      {
        q: "Can it make things up?",
        a: ["It cannot invent figures, because every number comes from your workspace. It can, however, answer the wrong topic if your question uses unexpected words, so check the linked screen."],
      },
      {
        q: "Can I ask about one product?",
        a: ["Not by name. Ask about stockouts, suppliers or overstock for the overview, then filter on the linked screen for the specific item."],
      },
    ],
    guides: ["reorder-expedite-or-transfer", "supplier-otif"],
    terms: ["stockout", "on-time-delivery-rate", "days-of-supply", "abc-analysis", "service-level"],
  },
};

export const FEATURE_PAGE_SLUGS = Object.keys(FEATURE_PAGES);
