import type { Inline } from "@/lib/blog/posts";
import type { FeaturePageData } from "@/lib/feature-pages";

/**
 * Calculator pages (/tools/<slug>). The maths lives in src/lib/calculators.ts
 * (tested); the widgets run in the browser and collect nothing. Same page
 * shape as the feature pages so one template renders both.
 */

export type ToolId = "reorder-point" | "safety-stock" | "eoq";
export interface ToolPageData extends FeaturePageData {
  tool: ToolId;
}

const U = "2026-11-24";
const gl = (slug: string, text: string): Inline => ({ href: `/glossary/${slug}`, text });
const bg = (slug: string, text: string): Inline => ({ href: `/blog/${slug}`, text });

export const TOOL_PAGES: Record<string, ToolPageData> = {
  "reorder-point-calculator": {
    slug: "reorder-point-calculator",
    tool: "reorder-point",
    metaTitle: "Reorder Point Calculator for Distributors",
    description:
      "Enter daily demand, lead time and safety stock to get your reorder point. Free, runs in your browser, with the formula and a worked example.",
    badge: "Free calculator",
    h1: "Reorder point calculator",
    lead: "Work out the stock level at which to place your next order so the shelf does not empty before the delivery arrives.",
    updated: U,
    sections: [
      {
        title: "How the reorder point is calculated",
        paragraphs: [
          [
            "The reorder point has two parts. The first is the demand you expect while you wait for the order: average daily demand multiplied by the lead time in days. The second is safety stock, the extra cushion for days when demand runs hot or the supplier runs late. Order when your stock position falls to the sum.",
          ],
          [
            "Use inventory position, meaning stock on hand plus stock already on order, when you compare against the reorder point. Comparing on-hand stock alone triggers a second order while the first is still on its way. See ",
            gl("quantity-on-hand", "quantity on hand and inventory position"),
            ".",
          ],
        ],
        formula: ["Reorder point = (average daily demand × lead time in days) + safety stock"],
      },
      {
        title: "A worked example",
        paragraphs: [
          [
            "Illustrative numbers: a SKU sells 21 units a day, the supplier takes 8 days, and you hold 84 units of safety stock. Lead time demand is 21 × 8 = 168 units. The reorder point is 168 + 84 = 252 units. When stock plus open orders reaches 252, place the order.",
          ],
        ],
        table: {
          head: ["Input", "Value", "Result"],
          rows: [
            ["Average daily demand", "21 units", ""],
            ["Lead time", "8 days", "Lead time demand 168 units"],
            ["Safety stock", "84 units", "Reorder point 252 units"],
          ],
        },
      },
      {
        title: "Getting the inputs right",
        bullets: [
          ["Daily demand: use recent outbound movement per warehouse, not a company-wide average, and keep one-off bulk orders out. See ", gl("average-daily-demand", "average daily demand"), "."],
          ["Lead time: use the measured time from order to receipt, plus your own time to approve and put away, not the supplier's quote. See ", bg("measure-supplier-lead-time-from-purchase-orders", "measuring lead time"), "."],
          ["Safety stock: size it for the service level you want, using the ", { href: "/tools/safety-stock-calculator", text: "safety stock calculator" }, "."],
          ["Units: keep demand and lead time in the same time unit, days with days."],
        ],
      },
      {
        title: "What to do with the result",
        paragraphs: [
          [
            "The reorder point tells you when. How much to order is a separate decision: see ",
            bg("how-to-calculate-reorder-quantity", "how to calculate reorder quantity"),
            " and the ",
            { href: "/tools/eoq-calculator", text: "EOQ calculator" },
            ". Recalculate whenever demand or lead time changes noticeably, at least monthly for fast movers. For the full method, read the ",
            bg("reorder-point-formula", "reorder point formula guide"),
            ".",
          ],
        ],
      },
    ],
    limits: [
      ["It assumes demand and lead time are steady. Erratic or intermittent items need extra safety stock or a different rule."],
      ["It gives one number per SKU and location. Run it for each warehouse separately."],
      ["It does not account for minimum order quantities, case packs or price breaks, which belong in the order quantity."],
      ["It does not look at stock on order for you. Compare the result with your inventory position, not on-hand stock."],
      ["Nothing you enter is stored or sent anywhere. The calculation runs in your browser."],
    ],
    faq: [
      {
        q: "What if I do not know my safety stock?",
        a: ["Start with the safety stock calculator, or use a simple rule such as half the lead time of demand, and review it after a few weeks of results."],
      },
      {
        q: "Should the reorder point be per warehouse?",
        a: ["Yes. Demand and sometimes lead time differ by location, and stock in one building cannot fill an order in another."],
      },
      {
        q: "How often should I recalculate it?",
        a: ["Whenever demand or lead time shifts, and at least monthly for fast movers. A reorder point set once and forgotten is a common cause of stockouts."],
      },
    ],
    guides: ["reorder-point-formula", "safety-stock-formula"],
    terms: ["lead-time", "average-daily-demand", "service-level", "quantity-on-hand", "min-max-inventory"],
  },

  "safety-stock-calculator": {
    slug: "safety-stock-calculator",
    tool: "safety-stock",
    metaTitle: "Safety Stock Calculator: Simple and Statistical",
    description:
      "Calculate safety stock two ways: the simple max-average method and the statistical service-level method. Free, in your browser, with worked examples.",
    badge: "Free calculator",
    h1: "Safety stock calculator",
    lead: "Size the buffer that protects you from demand spikes and late deliveries, using either the simple method or the service-level method.",
    updated: U,
    sections: [
      {
        title: "Two methods",
        paragraphs: [
          [
            "The simple method needs only your highest and average figures. Multiply the maximum daily usage by the longest lead time, then subtract average daily usage times average lead time. It is easy to explain and a sensible start when you have little history, but it is driven by your worst case, so it can be generous.",
          ],
          [
            "The statistical method ties the buffer to a service level you choose. It multiplies a z-score for that service level by the standard deviation of daily demand and by the square root of the lead time. It needs a measured standard deviation, which means a reasonable history of daily demand.",
          ],
        ],
        formula: [
          "Simple: Safety stock = (max daily use × max lead time) − (average daily use × average lead time)",
          "Statistical: Safety stock = z × σ(daily demand) × √(lead time in days)",
        ],
      },
      {
        title: "Service levels and z-scores",
        table: {
          head: ["Cycle service level", "z-score", "Safety stock if σ = 40 and lead time = 1 day"],
          rows: [
            ["90%", "1.28", "about 51 units"],
            ["95%", "1.65", "about 66 units"],
            ["97%", "1.88", "about 75 units"],
            ["98%", "2.05", "about 82 units"],
            ["99%", "2.33", "about 93 units"],
          ],
        },
        paragraphs: [
          [
            "Each extra point of service costs more stock than the last, which is why one target for every SKU wastes money. See ",
            gl("service-level", "service level"),
            " and ",
            bg("set-service-levels-by-abc-class", "setting service levels by ABC class"),
            ".",
          ],
        ],
      },
      {
        title: "A worked example",
        paragraphs: [
          [
            "Illustrative numbers: daily demand has a standard deviation of 12 units and the lead time is 9 days. At a 95% service level, safety stock = 1.65 × 12 × √9 = 1.65 × 12 × 3 = 59 units. At 99% it is 2.33 × 12 × 3 = 84 units. Moving from 95% to 99% costs 25 more units of buffer for this one SKU.",
          ],
        ],
      },
      {
        title: "Getting the inputs right",
        bullets: [
          ["Standard deviation: calculate it from daily outbound demand over 60 to 90 days, excluding one-off bulk orders and marking stockout days so they do not look like zero demand."],
          ["Lead time: use measured values. Variability in lead time also matters; if deliveries are erratic, add buffer or use the maximum lead time in the simple method."],
          ["Units: if your standard deviation is weekly, convert it to daily, or use weekly lead time."],
        ],
      },
    ],
    limits: [
      ["The statistical method assumes demand is roughly normally distributed and ignores lead time variability. For erratic or intermittent items it can understate the buffer."],
      ["The simple method is dominated by your single worst day and longest delivery, so one extreme event inflates it."],
      ["Neither method knows about a promotion, a lost customer or a season. Adjust for those yourself."],
      ["It gives one SKU at a time; run it per warehouse."],
      ["Nothing you enter is stored or sent anywhere. The calculation runs in your browser."],
    ],
    faq: [
      {
        q: "Which method should I use?",
        a: ["Use the simple method when you have little data, and the statistical method when you have at least a couple of months of daily demand and want to choose a service level on purpose."],
      },
      {
        q: "What service level should I choose?",
        a: ["Compare the cost of a stockout with the cost of holding the extra stock. Many distributors start around 95% and go higher for critical items."],
      },
      {
        q: "Why does lead time appear as a square root?",
        a: ["Because random variation in daily demand partly cancels out over several days, so uncertainty grows more slowly than the lead time itself."],
      },
    ],
    guides: ["safety-stock-formula", "reorder-point-formula"],
    terms: ["service-level", "lead-time", "intermittent-demand", "abc-analysis", "average-daily-demand"],
  },

  "eoq-calculator": {
    slug: "eoq-calculator",
    tool: "eoq",
    metaTitle: "EOQ Calculator: Economic Order Quantity",
    description:
      "Calculate economic order quantity from annual demand, order cost and holding cost. Free, in your browser, with the formula, worked example and limits.",
    badge: "Free calculator",
    h1: "Economic order quantity (EOQ) calculator",
    lead: "Find the order size that minimizes the combined yearly cost of placing orders and holding stock for an item with steady demand.",
    updated: U,
    sections: [
      {
        title: "The formula",
        paragraphs: [
          [
            "Ordering often in small amounts keeps stock low but adds ordering cost. Ordering rarely in big amounts saves on orders but raises holding cost. EOQ is the order size where the two balance, which is also where yearly ordering cost equals yearly holding cost.",
          ],
        ],
        formula: [
          "EOQ = √( 2 × D × S ÷ H )",
          "D = annual demand in units",
          "S = cost of placing one order",
          "H = cost of holding one unit for a year",
        ],
      },
      {
        title: "A worked example",
        paragraphs: [
          [
            "Illustrative numbers: annual demand of 5,000 units, $50 to place an order and $2.50 a year to hold one unit. EOQ = √(2 × 5,000 × 50 ÷ 2.5) = √200,000 ≈ 447 units, about 11 orders a year, one roughly every 33 days. Yearly ordering cost is about $559 and yearly holding cost is about $559.",
          ],
        ],
        table: {
          head: ["Input", "Value"],
          rows: [
            ["Annual demand (D)", "5,000 units"],
            ["Cost per order (S)", "$50"],
            ["Holding cost per unit per year (H)", "$2.50"],
            ["EOQ", "about 447 units"],
          ],
        },
      },
      {
        title: "Estimating S and H honestly",
        bullets: [
          ["Order cost S: add buyer time, approvals, receiving, invoice handling and fixed freight. It is usually larger than expected. See ", gl("economic-order-quantity", "ordering cost"), "."],
          ["Holding cost H: unit cost multiplied by your annual carrying rate (capital, storage, insurance, handling, shrinkage, obsolescence). Many distributors land between 20% and 30%, but use your own figure. See ", gl("inventory-carrying-cost", "carrying cost"), "."],
          ["Demand D: use a yearly figure that excludes one-off orders."],
        ],
      },
      {
        title: "How forgiving the answer is",
        paragraphs: [
          [
            "The total cost curve is flat near the EOQ. If you order 20% more or 20% less than the EOQ, yearly ordering plus holding cost rises by only about 1.7% (20% more) to 2.5% (20% less). That is why rounding up to a case pack or pallet rarely does harm, and why a MOQ slightly above the EOQ is usually acceptable. A MOQ several times the EOQ is a different story: the extra stock is where the cost builds.",
          ],
        ],
      },
      {
        title: "From EOQ to the order you place",
        paragraphs: [
          [
            "EOQ is a starting point. Round it to the supplier's case pack, then check minimum order quantities and price breaks. See ",
            bg("how-to-calculate-reorder-quantity", "how to calculate reorder quantity"),
            " for the full process, and the ",
            { href: "/tools/reorder-point-calculator", text: "reorder point calculator" },
            " for when to place it.",
          ],
        ],
      },
    ],
    limits: [
      ["EOQ assumes steady demand, a fixed cost per order and a fixed holding cost per unit. Seasonal, lumpy or trending items break those assumptions."],
      ["It ignores minimum order quantities, case packs, price breaks and shelf life. Adjust the result for them."],
      ["It is very sensitive to the holding cost you enter. A guessed H gives a guessed answer."],
      ["It treats each SKU alone and ignores freight savings from combining items on one order."],
      ["Nothing you enter is stored or sent anywhere. The calculation runs in your browser."],
    ],
    faq: [
      {
        q: "Is EOQ still useful for a distributor?",
        a: ["For steady, high-volume items it is a sound default order size. For erratic, seasonal or MOQ-bound items use judgment or a different policy."],
      },
      {
        q: "What if my supplier has a minimum order quantity?",
        a: ["If the MOQ is above the EOQ, you pay for extra holding cost. Compare that with the alternatives: combining items, a different supplier or a special order."],
      },
      {
        q: "Does a lower order cost change the answer?",
        a: ["Yes. A cheaper order, for example through automated purchase order creation, lowers the EOQ and makes smaller, more frequent orders economic."],
      },
    ],
    guides: ["reorder-point-formula", "safety-stock-formula"],
    terms: ["economic-order-quantity", "inventory-carrying-cost", "cycle-stock", "lead-time", "total-cost-of-ownership"],
  },
};

export const TOOL_PAGE_SLUGS = Object.keys(TOOL_PAGES);
