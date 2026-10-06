/**
 * Blog posts for the marketing site. Every formula and threshold here is
 * the one the app actually uses (docs/metrics.md, src/lib/metrics/*) or a
 * standard textbook formula labelled as such — never an invented benchmark,
 * customer, or result. Worked examples use made-up round numbers and say so.
 *
 * When you edit a post, move its `updated` date: sitemap.xml and the
 * article's dateModified read it.
 */

/** A run of text, or a link inside a paragraph. */
export type Inline = string | { href: string; text: string };

export type Block =
  | { type: "p"; content: Inline[] }
  | { type: "h2"; text: string }
  | { type: "ul"; items: Inline[][] }
  | { type: "formula"; lines: string[] }
  | { type: "note"; content: Inline[] };

export interface BlogPost {
  slug: string;
  title: string;
  /** <title> tag; kept under ~60 characters. */
  metaTitle: string;
  /** Meta description; kept under ~160 characters. */
  description: string;
  published: string; // YYYY-MM-DD
  updated: string; // YYYY-MM-DD
  readingMinutes: number;
  body: Block[];
}

const DEMO = { href: "/dashboard/overview?demo=true", text: "open the live demo" };

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "reorder-point-formula",
    title: "Reorder Point Formula: How Distributors Decide When to Reorder",
    metaTitle: "Reorder Point Formula for Distributors (With Examples)",
    description:
      "The reorder point formula explained for wholesale distributors: average daily demand, supplier lead time and safety stock, with a worked example.",
    published: "2026-10-06",
    updated: "2026-10-06",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        content: [
          "Every distributor has the same morning question: which SKUs need a purchase order today? The reorder point is the simplest honest answer. It is the stock level at which you place a new order so the shelf doesn't empty before the delivery arrives.",
        ],
      },
      { type: "h2", text: "The reorder point formula" },
      {
        type: "formula",
        lines: [
          "Reorder Point = (Average Daily Demand × Supplier Lead Time) + Safety Stock",
        ],
      },
      {
        type: "p",
        content: [
          "The first half is the stock you expect to sell while you wait for the supplier. The second half, safety stock, is the buffer for the days when demand runs hot or the supplier runs late.",
        ],
      },
      { type: "h2", text: "Step 1: Average daily demand from real outbound movement" },
      {
        type: "p",
        content: [
          "Use what actually left the warehouse, not a number someone typed into a planning sheet. A common window is the trailing 90 days: add up every unit sold (and every unit transferred out to another warehouse, because that also empties this shelf) and divide by 90.",
        ],
      },
      {
        type: "formula",
        lines: ["Average Daily Demand = units shipped out in the last 90 days ÷ 90"],
      },
      {
        type: "p",
        content: [
          "If nothing moved in 90 days, don't call demand zero and move on. That SKU has no recent demand, which is a different problem (dead stock) with a different fix.",
        ],
      },
      { type: "h2", text: "Step 2: Supplier lead time" },
      {
        type: "p",
        content: [
          "Lead time is the number of days from placing the order to having stock you can sell. Use the supplier's real recent lead time if you track it. A contract lead time that the supplier routinely misses will make every reorder point too low. If you don't know a supplier's lead time yet, record it as unknown rather than guessing quietly — a guessed lead time looks exactly like a real one in a spreadsheet.",
        ],
      },
      { type: "h2", text: "Step 3: Safety stock" },
      {
        type: "p",
        content: [
          "Safety stock has its own article: ",
          { href: "/blog/safety-stock-formula", text: "the safety stock formula, simple and statistical" },
          ". For the example below we use the simple rule of covering half the lead time.",
        ],
      },
      { type: "h2", text: "Worked example" },
      {
        type: "p",
        content: [
          "Illustrative numbers: a SKU shipped 1,890 units from one warehouse in the last 90 days, and its supplier delivers in 8 days.",
        ],
      },
      {
        type: "formula",
        lines: [
          "Average Daily Demand = 1,890 ÷ 90 = 21 units/day",
          "Demand during lead time = 21 × 8 = 168 units",
          "Safety Stock = 21 × (8 × 50%) = 84 units",
          "Reorder Point = 168 + 84 = 252 units",
        ],
      },
      {
        type: "p",
        content: [
          "When available stock at that warehouse drops to 252 units or below, it is time to order.",
        ],
      },
      { type: "h2", text: "Where a flat reorder point falls short" },
      {
        type: "ul",
        items: [
          [
            "It ignores what's already on order. If a purchase order lands in three days, you may not need another one. Count inbound POs — but only the ones arriving before you would run out.",
          ],
          [
            "It is per warehouse. A SKU can be short in one location and overstocked in another; the answer may be a transfer, not a new order. See ",
            { href: "/blog/reorder-expedite-or-transfer", text: "reorder, expedite or transfer" },
            ".",
          ],
          [
            "It assumes demand is steady. Seasonal and lumpy SKUs need a forecast, not a 90-day average. See ",
            { href: "/features/demand-forecasting", text: "demand forecasting for distributors" },
            ".",
          ],
        ],
      },
      { type: "h2", text: "How Supply Chain Manager uses it" },
      {
        type: "p",
        content: [
          "Supply Chain Manager calculates the reorder point for every SKU at every warehouse from your own transactions and supplier lead times, then walks stock forward day by day, crediting each inbound PO on the day it is due, to find the day you would actually run out. Each alert shows the numbers behind it. To see it on sample data, ",
          DEMO,
          ".",
        ],
      },
    ],
  },
  {
    slug: "safety-stock-formula",
    title: "Safety Stock Formula: The Simple Rule and the Statistical Method",
    metaTitle: "Safety Stock Formula: Simple vs Statistical Method",
    description:
      "Two ways to calculate safety stock for a distributor — a lead-time rule of thumb and the statistical formula using demand and lead-time variability.",
    published: "2026-10-06",
    updated: "2026-10-06",
    readingMinutes: 7,
    body: [
      {
        type: "p",
        content: [
          "Safety stock is the stock you keep so that a busy week or a late truck doesn't turn into an empty shelf. Too little and you stock out; too much and cash sits in the warehouse. There are two common ways to size it.",
        ],
      },
      { type: "h2", text: "Method 1: Cover part of the lead time" },
      {
        type: "formula",
        lines: ["Safety Stock = Average Daily Demand × (Lead Time × 50%)"],
      },
      {
        type: "p",
        content: [
          "This rule says: keep enough extra stock to cover half of the supplier's lead time at your normal selling rate. A SKU selling 21 units a day from a supplier with an 8-day lead time gets 21 × 4 = 84 units of safety stock.",
        ],
      },
      {
        type: "p",
        content: [
          "It is easy to explain and needs only two numbers you already have. Its weakness is that it treats a steady SKU and an erratic SKU the same way when their average is the same.",
        ],
      },
      { type: "h2", text: "Method 2: The statistical formula" },
      {
        type: "p",
        content: [
          "The textbook formula sizes the buffer from how much demand and lead time actually vary:",
        ],
      },
      {
        type: "formula",
        lines: [
          "Safety Stock = Z × √( L × σd² + d̄² × σL² )",
          "",
          "Z   = service-level factor (1.65 for about 95%)",
          "L   = average lead time in days",
          "σd  = standard deviation of daily demand",
          "d̄   = average daily demand",
          "σL  = standard deviation of lead time in days",
        ],
      },
      {
        type: "p",
        content: [
          "The first term inside the root covers demand swings during the lead time; the second covers the supplier arriving early or late. If your supplier is perfectly punctual, σL is zero and the formula reduces to Z × σd × √L.",
        ],
      },
      { type: "h2", text: "Worked example" },
      {
        type: "p",
        content: ["Illustrative numbers for one SKU at one warehouse:"],
      },
      {
        type: "formula",
        lines: [
          "d̄ = 20 units/day, σd = 6 units/day",
          "L = 10 days, σL = 2 days, Z = 1.645 (95%)",
          "",
          "L × σd² = 10 × 36 = 360",
          "d̄² × σL² = 400 × 4 = 1,600",
          "√(360 + 1,600) = √1,960 ≈ 44.3",
          "Safety Stock ≈ 1.645 × 44.3 ≈ 73 units",
        ],
      },
      {
        type: "p",
        content: [
          "Notice that the lead-time term (1,600) dominates. For many distributors, an unreliable supplier costs more safety stock than unpredictable customers do. That is a good reason to measure ",
          { href: "/blog/supplier-otif", text: "supplier OTIF and lead-time slippage" },
          ".",
        ],
      },
      { type: "h2", text: "Which one should you use?" },
      {
        type: "ul",
        items: [
          [
            "Use the simple rule when you have little history, or you need a number everyone on the team can check by hand.",
          ],
          [
            "Use the statistical method for fast movers with enough history to measure variability, and for suppliers whose delivery dates wander.",
          ],
          [
            "Use neither blindly for intermittent SKUs (many zero days, occasional large orders). The standard deviation of mostly-zero demand is misleading; those SKUs need an intermittent-demand forecast such as Croston's method.",
          ],
        ],
      },
      { type: "h2", text: "Common mistakes" },
      {
        type: "ul",
        items: [
          ["Using the supplier's quoted lead time instead of the one they actually deliver."],
          ["Setting one safety-stock percentage for the whole catalog."],
          ["Never revisiting it: demand and suppliers change, and safety stock should follow."],
        ],
      },
      {
        type: "p",
        content: [
          "Supply Chain Manager recalculates safety stock and the ",
          { href: "/blog/reorder-point-formula", text: "reorder point" },
          " for every SKU and warehouse from your own data and shows the inputs next to each recommendation. To see it on sample data, ",
          DEMO,
          ".",
        ],
      },
    ],
  },
  {
    slug: "supplier-otif",
    title: "How to Calculate Supplier OTIF (On-Time In-Full)",
    metaTitle: "How to Calculate Supplier OTIF (On-Time In-Full)",
    description:
      "What supplier OTIF means, how to calculate it from purchase orders, a worked example, and the mistakes that make OTIF scores misleading.",
    published: "2026-10-06",
    updated: "2026-10-06",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        content: [
          "OTIF — on time, in full — is the share of a supplier's purchase orders that arrived by the promised date and with the full quantity. It is the most widely used single measure of supplier reliability, and it feeds directly into how much safety stock you need.",
        ],
      },
      { type: "h2", text: "The OTIF formula" },
      {
        type: "formula",
        lines: [
          "On time  = received date ≤ expected date",
          "In full  = quantity received ≥ quantity ordered",
          "OTIF %   = POs that were both on time and in full ÷ POs received in the period × 100",
        ],
      },
      { type: "h2", text: "Pick a window and stick to it" },
      {
        type: "p",
        content: [
          "Measure over a trailing window — 90 days is common — keyed on the date each PO was received. A trailing window shows whether a supplier is getting better or worse; an all-time number hides it.",
        ],
      },
      { type: "h2", text: "Worked example" },
      {
        type: "p",
        content: [
          "Illustrative numbers: a supplier delivered 47 purchase orders in the last 90 days. 38 arrived on time; of those, 34 were also complete.",
        ],
      },
      {
        type: "formula",
        lines: ["OTIF = 34 ÷ 47 × 100 = 72.3%"],
      },
      {
        type: "p",
        content: [
          "Note what OTIF does not tell you: how late the late ones were. A supplier that misses by one day and one that misses by three weeks can have the same OTIF. Track average days late alongside it.",
        ],
      },
      { type: "h2", text: "Mistakes that make OTIF misleading" },
      {
        type: "ul",
        items: [
          [
            "Reporting 0% for a supplier with no deliveries in the window. That is \"no data\", not bad performance — show it as unknown.",
          ],
          [
            "Moving the expected date when the supplier says they'll be late. Then everything is on time. Keep the original promised date.",
          ],
          [
            "Averaging OTIF across suppliers equally. A supplier you spend $500 with shouldn't weigh as much as one you spend $500,000 with; weight the overall figure by spend.",
          ],
          [
            "Ignoring overdue POs. An order that hasn't arrived and is past due is already late, even though it isn't in the received count yet. Flag it.",
          ],
        ],
      },
      { type: "h2", text: "What to do with a low OTIF" },
      {
        type: "ul",
        items: [
          [
            "Raise safety stock for that supplier's SKUs — the ",
            { href: "/blog/safety-stock-formula", text: "statistical safety stock formula" },
            " does this automatically through lead-time variability.",
          ],
          ["Use the real lead time, not the contract one, in reorder points."],
          ["Bring the numbers to the next supplier review; dated PO history is hard to argue with."],
        ],
      },
      {
        type: "p",
        content: [
          "Supply Chain Manager builds a ",
          { href: "/features/supplier-scorecards", text: "supplier scorecard" },
          " from your purchase orders: trailing 90-day OTIF per supplier, a spend-weighted overall figure, and alerts for overdue POs. Suppliers with no deliveries in the window show as unknown, never 0%. One limit to know: if your data has no partial-receipt quantity, \"in full\" can only mean \"received\". To see it on sample data, ",
          DEMO,
          ".",
        ],
      },
    ],
  },
  {
    slug: "overstock-vs-dead-stock",
    title: "Overstock, Slow-Moving and Dead Stock: How to Tell Them Apart",
    metaTitle: "Overstock vs Slow-Moving vs Dead Stock (With Rules)",
    description:
      "Clear rules for classifying overstock, slow-moving and dead stock per SKU and warehouse, and what to do about each one.",
    published: "2026-10-06",
    updated: "2026-10-06",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        content: [
          "\"We have too much stock\" covers three different problems with three different fixes. Lumping them together is how a distributor ends up discounting an item that would have sold through next month, while a truly dead SKU sits for another year.",
        ],
      },
      { type: "h2", text: "Start with days of stock" },
      {
        type: "formula",
        lines: ["Days of Stock = Available Stock ÷ Average Daily Demand"],
      },
      {
        type: "p",
        content: [
          "Days of stock answers \"at the current pace, how long will this last?\" Compute it per SKU per warehouse — a company-wide figure hides a warehouse that is drowning next to one that is short. Average daily demand comes from the trailing 90 days of outbound movement, as in ",
          { href: "/blog/reorder-point-formula", text: "the reorder point article" },
          ".",
        ],
      },
      { type: "h2", text: "Three different problems" },
      {
        type: "ul",
        items: [
          [
            "Dead stock: stock on hand and nothing shipped out in 90 days. Days of stock can't even be calculated, because demand is zero. Fix: decide on purpose — return to vendor, liquidate, or keep as a deliberate service part — and stop reordering it.",
          ],
          [
            "Slow-moving: it does sell, but at the current pace the stock lasts more than about six months (over 180 days of stock). Fix: stop reordering until it drops back toward its reorder point; consider moving it to the warehouse where it sells.",
          ],
          [
            "Overstock: demand is healthy, but you are holding more than you need. A practical threshold is safety stock plus 30 days of demand. Fix: delay or shrink the next purchase order rather than discounting.",
          ],
        ],
      },
      { type: "h2", text: "Classify in order of urgency" },
      {
        type: "p",
        content: [
          "Give each SKU-warehouse pair exactly one status, checking the most urgent first so a problem is never hidden behind a milder one:",
        ],
      },
      {
        type: "formula",
        lines: [
          "1. Stock-out risk  available ≤ 0, or 3 days of stock or less",
          "2. Dead stock      no outbound movement in 90 days, stock on hand",
          "3. Slow-moving     more than 180 days of stock",
          "4. Low stock       available below safety stock",
          "5. Overstock       available above safety stock + 30 days of demand",
          "6. Healthy         none of the above",
        ],
      },
      { type: "h2", text: "Worked example" },
      {
        type: "p",
        content: [
          "Illustrative numbers: a SKU sells 21 units a day, its safety stock is 84 units, and the warehouse holds 1,000 units.",
        ],
      },
      {
        type: "formula",
        lines: [
          "Overstock threshold = 84 + (21 × 30) = 714 units",
          "Days of stock = 1,000 ÷ 21 ≈ 48 days",
          "→ Overstock (above 714), but not slow-moving (under 180 days)",
          "Excess = 1,000 − 714 = 286 units tied up",
        ],
      },
      {
        type: "p",
        content: [
          "Multiply the excess by unit cost to see the cash tied up. That figure, summed across the catalog, is usually the number that gets a planning meeting's attention.",
        ],
      },
      {
        type: "p",
        content: [
          "Supply Chain Manager applies exactly this classification to every SKU at every warehouse and rolls overstock into one alert showing how many positions are over and how much capital that ties up. To see it on sample data, ",
          DEMO,
          ".",
        ],
      },
    ],
  },
  {
    slug: "reorder-expedite-or-transfer",
    title: "Reorder, Expedite or Transfer? Fixing a Projected Stockout",
    metaTitle: "Reorder, Expedite or Transfer? Fixing a Stockout",
    description:
      "When a SKU is heading for a stockout, a new purchase order isn't always the answer. How distributors choose between reordering, expediting and transferring.",
    published: "2026-10-06",
    updated: "2026-10-06",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        content: [
          "A projection says a SKU will run out at one warehouse in nine days. The reflex is to raise a purchase order. Sometimes that is right. Sometimes it double-orders stock that is already on a truck, or waits two weeks for a supplier when another warehouse has plenty sitting idle.",
        ],
      },
      { type: "h2", text: "First, project stock day by day" },
      {
        type: "p",
        content: [
          "Start from available stock, subtract expected daily demand, and add each inbound purchase order on the day it is due to land. The first day the balance would go below zero is the projected stockout date. Look far enough ahead to cover the supplier's lead time plus your review period — anything you order today can't arrive sooner than that.",
        ],
      },
      { type: "h2", text: "Then choose one of three fixes" },
      {
        type: "ul",
        items: [
          [
            "Reorder — there is no PO already in transit for this SKU and warehouse. Cut a new purchase order, sized to bring stock back above the ",
            { href: "/blog/reorder-point-formula", text: "reorder point" },
            ".",
          ],
          [
            "Expedite — a PO exists, but it is due to land after the projected stockout date. Ordering again would double up; the fix is to pull the existing order forward.",
          ],
          [
            "Transfer — another warehouse holds more than it needs for its own demand and can cover the gap without waiting for the supplier at all.",
          ],
        ],
      },
      { type: "h2", text: "When is a transfer safe?" },
      {
        type: "p",
        content: [
          "Only move stock a sibling warehouse can genuinely spare. Work out what that warehouse needs to stay above its own safety stock over the same horizon, and only offer the surplus beyond that. Otherwise the transfer just moves the stockout from one building to another.",
        ],
      },
      { type: "h2", text: "Worked example" },
      {
        type: "p",
        content: ["Illustrative numbers for one SKU across two warehouses:"],
      },
      {
        type: "formula",
        lines: [
          "Warehouse A: 180 on hand, 20/day demand → runs out on day 9",
          "Open PO for 500 units due to land at A on day 14 (after day 9)",
          "Warehouse B: 900 on hand, 10/day demand, safety stock 60",
          "",
          "Reorder? No — a PO already exists.",
          "Expedite? Yes, if the supplier can land it by day 9.",
          "Transfer? B needs about 14 × 10 + 60 = 200 through day 14,",
          "  so ~700 units are spare; sending 100 covers A until the PO lands.",
        ],
      },
      {
        type: "p",
        content: [
          "In practice the right answer is often a small transfer now plus a firm conversation with the supplier about the late PO — which is where ",
          { href: "/blog/supplier-otif", text: "OTIF history" },
          " helps.",
        ],
      },
      { type: "h2", text: "Why the projection and the alert must agree" },
      {
        type: "p",
        content: [
          "If the chart a planner looks at and the rule that raises the alert use different math, people stop trusting both. Build them from the same day-by-day walk so the chart shows exactly why the alert fired.",
        ],
      },
      {
        type: "p",
        content: [
          "Supply Chain Manager does this walk for every SKU and warehouse, labels each problem as reorder, expedite or transfer, and draws the projection so you can check it. ",
          { href: "/features/purchase-orders", text: "Suggested purchase orders" },
          " are one click away when a reorder is the answer. To see it on sample data, ",
          DEMO,
          ".",
        ],
      },
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
