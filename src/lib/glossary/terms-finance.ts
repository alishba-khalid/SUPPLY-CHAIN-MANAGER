import { g, guide, type GlossaryTerm } from "./types";

const U = "2026-11-24";

/**
 * Inventory-finance terms, consolidated from 15 pages to 6 fuller ones
 * (docs/seo/glossary-merge-map.json). Removed slugs are redirected in
 * merged.ts. Accounting statements are general information, not advice, and
 * the rules cited are in the page `sources`. Product statements (`inApp`)
 * were checked against src/lib/insights/alerts.ts and the app's metrics on
 * 2026-11-24.
 */
export const FINANCE_TERMS: GlossaryTerm[] = [
  {
    slug: "inventory-turnover",
    term: "Inventory Turnover",
    short: "Inventory turnover",
    metaTitle: "Inventory Turnover, DIO and Sell-Through Explained",
    category: "finance",
    definition:
      "Inventory turnover is how many times stock is sold and replaced in a year. DIO, sell-through and stock-to-sales express the same speed in other ways.",
    explain: [
      [
        "Higher turnover means stock moves faster and less cash is tied up for each dollar of sales. Very high turnover can also mean stock is too thin and stockouts are frequent, so read it alongside ",
        g("fill-rate", "fill rate"),
        ".",
      ],
      [
        "It can be calculated in value (cost of goods sold divided by average inventory at cost) for the business or a category, or in units (units sold divided by average units on hand) for a single SKU.",
      ],
    ],
    formula: [
      "Inventory Turnover = Cost of Goods Sold ÷ Average Inventory (at cost)",
      "Average Inventory = (Opening Inventory + Closing Inventory) ÷ 2",
    ],
    sections: [
      {
        title: "Days inventory outstanding (DIO): turnover in days",
        paragraphs: [
          [
            "DIO is the average number of days a business holds inventory before selling it. It is inventory turnover expressed in days, a finance measure for the whole business or a category. Days of supply, by contrast, looks forward at a single SKU's stock against its recent sales pace.",
          ],
          [
            "Because DIO uses cost of goods sold, it is an average across the whole range. A healthy company-wide DIO can hide a few categories that hold a year of stock and others that turn every two weeks. Breaking it down by category or supplier shows where the cash is actually sitting. Use an average inventory figure rather than period-end stock, which swings with seasonal timing.",
          ],
        ],
        formula: ["DIO = Average Inventory ÷ Cost of Goods Sold × 365"],
      },
      {
        title: "Sell-through rate: did what we bought actually sell?",
        paragraphs: [
          [
            "Sell-through rate is the percentage of stock received over a period that was actually sold in that period. It is widely used in retail and for seasonal or new products, where low sell-through is an early sign a line was over-bought. It is most useful tracked over time for the same product or season: a line that sells through 30% in its first month and 60% in its second behaves very differently from one that sold 40% and then stalled.",
          ],
        ],
        formula: ["Sell-Through % = Units sold ÷ (Opening units + Units received) × 100"],
      },
      {
        title: "Stock-to-sales ratio: a warning light",
        paragraphs: [
          [
            "The stock-to-sales ratio compares inventory value at the start of a period with sales in that period, showing how much stock supports each dollar of sales. A ratio of 3 means you hold three times a month's sales in stock. If it climbs for several months while sales are flat, stock is building somewhere, and the next step is SKU-level days of supply to find where.",
          ],
        ],
        formula: ["Stock-to-Sales Ratio = Inventory value at start of period ÷ Sales value for the period"],
      },
      {
        title: "Which measure when",
        table: {
          head: ["Measure", "Answers", "Best level"],
          rows: [
            ["Inventory turnover", "How many times did stock sell through this year?", "Business or category"],
            ["DIO", "How many days of stock do we hold on average?", "Business or category; feeds cash cycle"],
            ["Sell-through rate", "Did this purchase sell?", "New or seasonal lines"],
            ["Stock-to-sales ratio", "Is stock growing faster than sales?", "Category, monthly"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: COGS of $3.6 million and average inventory of $600,000 give a turnover of 6, meaning stock turns over about every two months, and DIO = 600,000 ÷ 3,600,000 × 365 ≈ 61 days. Raising turnover to 8 at the same sales would release $150,000 of cash. For sell-through: 200 units on hand at the start of the season, 800 received, 650 sold gives 650 ÷ 1,000 = 65%. For stock-to-sales: $450,000 of stock at the start of the month and $150,000 of sales is a ratio of 3.",
      ],
    ],
    why: [
      [
        "Turnover is the bridge between inventory and cash. Looking at it by category or SKU shows where stock is earning its keep and where it is sitting, and it is the first step to cutting the cash tied up in stock without hurting service.",
      ],
    ],
    mistakes: [
      ["Dividing sales at selling price by inventory at cost, which overstates turnover."],
      ["Comparing turnover across very different product types without context."],
      ["Using period-end inventory instead of an average, which swings with seasonal timing."],
      ["Confusing DIO with SKU-level days of supply."],
      ["Measuring sell-through over too short a period for slow lines, or ignoring returns."],
    ],
    inApp: [
      "Supply Chain Manager does not calculate turnover, DIO, sell-through or stock-to-sales. It works at SKU level: days of stock per SKU and warehouse, with a flag for stock above 180 days of supply, and a card for stock held above its overstock threshold. For the business-level ratios, take cost of goods sold and average inventory from your accounts.",
    ],
    faq: [
      {
        q: "What is a good inventory turnover for a distributor?",
        a: ["It varies by product and sector, so compare your own categories with each other and with your own history rather than with a single industry figure."],
      },
      {
        q: "How do I convert turnover to days?",
        a: ["Divide 365 by turnover. A turnover of 6 is about 61 days, which is the same as DIO."],
      },
    ],
    related: ["cash-to-cash-cycle", "gmroi", "days-of-supply", "inventory-carrying-cost", "fill-rate"],
    guides: ["overstock-vs-dead-stock"],
    updated: U,
  },
  {
    slug: "inventory-carrying-cost",
    term: "Inventory Carrying Cost",
    short: "Carrying cost",
    category: "finance",
    definition:
      "Inventory carrying cost is the full cost of holding stock: capital, storage, insurance, handling, shrinkage and obsolescence, usually a yearly % of value.",
    explain: [
      [
        "The largest part is often the cost of capital: money in stock is money not available elsewhere. Storage space, insurance, counts and handling come next, and then the risk that stock is damaged, lost or never sells.",
      ],
      [
        "Textbooks often quote 20 to 30% of inventory value a year. Your own figure depends on interest rates, warehouse costs and how quickly your products become obsolete, so it is worth estimating rather than borrowing.",
      ],
    ],
    formula: ["Annual Carrying Cost = Average Inventory Value × Carrying Cost Rate (% per year)"],
    sections: [
      {
        title: "Building your own carrying cost rate",
        table: {
          head: ["Component", "How to estimate", "Often missed because"],
          rows: [
            ["Cost of capital", "Your borrowing cost or the return you could earn elsewhere", "It never appears on an invoice"],
            ["Storage and space", "Warehouse cost per pallet or per square metre, applied to stock held", "Rent is fixed, so it looks free to hold more"],
            ["Insurance and tax", "Premiums and property taxes on stock", "They sit in general overhead"],
            ["Handling and counts", "Labor on moving and counting extra stock", "It is spread across the team"],
            ["Shrinkage and obsolescence", "Past write-offs divided by average stock value", "Written off in a different year from the order"],
          ],
        },
      },
      {
        title: "Where to use the number",
        paragraphs: [
          [
            "Carrying cost is what makes overstock expensive, and it is the number to compare against a quantity discount, a forward buy or a higher ",
            g("service-level", "service level"),
            ". It also sets the holding cost H in the order quantity formula (see ",
            g("economic-order-quantity", "EOQ"),
            "). A distributor with a 25% carrying rate pays roughly 2% of an item's value for each month it sits, which is why a small discount for buying early does not always win.",
          ],
          [
            "Use different rates where risk differs. Perishable or fast-obsoleting goods carry a much higher obsolescence component than durable ones, and one rate applied to both distorts decisions on each.",
          ],
          [
            "Revisit the rate once a year. A rise in borrowing costs or a new warehouse lease changes the number, and a rate that was right two years ago can make you consistently over- or under-buy. Keep a short note of how the figure was built so the next review starts from the components, not from a guess.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: $600,000 of average inventory at a 25% carrying rate costs about $150,000 a year to hold. Every $10,000 of stock you do not need costs roughly $2,500 a year, or about $208 a month.",
      ],
    ],
    why: [
      [
        "Carrying cost turns 'we have a bit too much' into a figure. It lets you compare the saving from a bulk purchase with the cost of holding it, and justify the effort of clearing slow stock.",
      ],
    ],
    mistakes: [
      ["Counting only warehouse rent and ignoring the cost of capital."],
      ["Using one rate for perishable and durable goods alike."],
      ["Borrowing an industry rate without checking it against your own costs."],
    ],
    inApp: [
      "Supply Chain Manager does not calculate carrying cost. It shows the capital tied up in overstock, calculated as the units above a lead-time-based threshold (three times the target stock) multiplied by unit cost, which you can multiply by your own carrying rate.",
    ],
    faq: [
      {
        q: "What is a typical carrying cost rate?",
        a: ["Textbooks often quote 20 to 30% a year. Estimate your own from capital, storage, insurance, handling and obsolescence."],
      },
      {
        q: "Does carrying cost include the purchase price?",
        a: ["No. It is the cost of holding stock, applied as a percentage to the value of the stock held."],
      },
    ],
    related: ["economic-order-quantity", "inventory-turnover", "cycle-stock", "inventory-write-off", "total-cost-of-ownership"],
    guides: ["overstock-vs-dead-stock"],
    updated: U,
  },
  {
    slug: "fifo",
    term: "FIFO (First In, First Out)",
    short: "FIFO",
    metaTitle: "FIFO, LIFO and Weighted Average Cost Explained",
    category: "finance",
    definition:
      "FIFO charges the oldest purchase costs to cost of goods sold first. LIFO uses the newest and weighted average blends all of them. Each gives different margins.",
    explain: [
      [
        "As a valuation method, FIFO charges the oldest purchase costs to cost of goods sold, so remaining inventory is valued at the most recent costs. When prices are rising, that gives lower COGS and higher reported profit than LIFO. Physically, FIFO rotation keeps older stock moving so it does not age on the shelf. For dated goods, the picking rule that matters is FEFO, covered under ",
        g("lot-tracking", "lot tracking"),
        ".",
      ],
      [
        "The valuation method does not need to match the physical picking order. It is an accounting choice that affects reported margin and inventory value, not what is on the shelf.",
      ],
    ],
    sections: [
      {
        title: "LIFO: newest costs first",
        paragraphs: [
          [
            "LIFO (last in, first out) charges the most recent purchase costs to cost of goods sold first. When prices rise, LIFO gives higher COGS and lower taxable profit than FIFO, which is why some US businesses use it. It is not permitted under IFRS, and in the US it is subject to specific tax and reporting rules, so it is a decision for your accountant.",
          ],
        ],
      },
      {
        title: "Weighted average cost: one blended cost",
        paragraphs: [
          [
            "Weighted average cost values every unit of a SKU at the average cost of all units held, recalculated as new stock is bought at different prices. It smooths out price changes between purchases, so cost of goods sold sits between FIFO and LIFO when prices move. With a perpetual moving average, the average is recalculated each time stock is received, which many inventory and ERP systems do. With a periodic weighted average, it is recalculated at the end of a period from all purchases in it.",
          ],
          [
            "Average cost is simple and stable, which makes margin reporting easier to read. It is also a common baseline for spotting price variance on new purchase orders. Include freight and duties (see ",
            g("total-cost-of-ownership", "landed cost"),
            ") or the average understates true cost, and avoid stock adjustments at zero cost, which distort it.",
          ],
        ],
        formula: ["Average Cost = (Existing units × Existing average cost + New units × New unit cost) ÷ Total units"],
      },
      {
        title: "The same sales, three methods",
        table: {
          head: ["Method", "Cost of the 150 units sold", "Value of the 50 left"],
          rows: [
            ["FIFO", "$650 (100 × $4 + 50 × $5)", "$250 (50 × $5)"],
            ["LIFO", "$700 (100 × $5 + 50 × $4)", "$200 (50 × $4)"],
            ["Weighted average", "$675 (150 × $4.50)", "$225 (50 × $4.50)"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: you bought 100 units at $4 and then 100 at $5, and sold 150. Under FIFO, COGS = 100 × $4 + 50 × $5 = $650 and the 50 units left are valued at $250. Under LIFO, COGS = 100 × $5 + 50 × $4 = $700 and the remainder is $200. Under weighted average the cost is $4.50 a unit, so COGS is $675 and the remainder $225.",
      ],
    ],
    why: [
      [
        "The valuation method does not change how much stock you have or need. It changes reported margins and inventory value, which matters when comparing figures across businesses or periods. This page is general information, not accounting advice. Your accountant chooses the method.",
      ],
    ],
    mistakes: [
      ["Assuming the valuation method has to match physical picking order."],
      ["Comparing gross margins between a LIFO and a FIFO business without adjusting."],
      ["Ignoring FEFO for dated goods, where expiry matters more than arrival order."],
      ["Leaving freight and duties out of the average, so it understates true cost."],
    ],
    inApp: [
      "Supply Chain Manager does not value inventory. It holds one unit cost per product and uses it for values such as capital tied up and price variance. It does not apply FIFO, LIFO or average costing.",
    ],
    faq: [
      {
        q: "Which method should a distributor use?",
        a: ["Ask your accountant. FIFO and weighted average are the most widely accepted. LIFO is not allowed under IFRS and is subject to US tax rules."],
      },
      {
        q: "Does the method change my reorder decisions?",
        a: ["No. It changes reported profit and inventory value, not stock quantities, demand or lead times."],
      },
    ],
    sources: [
      { label: "IAS Plus, IAS 2 Inventories (summary of the IFRS standard)", url: "https://www.iasplus.com/standard/ias02.htm" },
      { label: "KPMG, Inventory accounting: IFRS Accounting Standards vs US GAAP", url: "https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html" },
    ],
    related: ["inventory-carrying-cost", "lot-tracking", "inventory-write-off", "total-cost-of-ownership", "inventory-turnover"],
    updated: U,
  },
  {
    slug: "gmroi",
    term: "GMROI (Gross Margin Return on Inventory Investment)",
    short: "GMROI",
    metaTitle: "GMROI and Open-to-Buy: Formula & Example",
    category: "finance",
    definition:
      "GMROI is the gross margin earned per dollar of average inventory at cost. Open-to-buy is the purchasing budget left once planned sales and stock are covered.",
    explain: [
      [
        "GMROI combines margin and turnover in one number. A low-margin SKU that turns fast can earn the same GMROI as a high-margin SKU that turns slowly. Below 1 means the item earns less in a year than the money tied up in it.",
      ],
      [
        "It is particularly useful when deciding which product lines deserve more shelf space or investment. A line with a modest margin percentage but fast turnover can return more gross margin per dollar of stock than a premium line that sits for months, and comparing lines on GMROI rather than margin percentage often changes the ranking.",
      ],
    ],
    formula: ["GMROI = Annual Gross Margin ÷ Average Inventory at Cost"],
    sections: [
      {
        title: "Open-to-buy: how much you can still commit",
        paragraphs: [
          [
            "Open-to-buy (OTB) is the budget left for new purchases in a period after planned sales, planned closing stock and orders already placed are accounted for. It comes from retail merchandise planning, but the idea suits any distributor managing a stock budget: you can only buy what the plan says you will sell, plus any planned change in stock, minus what is already on order.",
          ],
          [
            "In distribution, OTB is often set at category or supplier level each month. Within that budget, SKU-level reorder rules decide what to buy. If the budget is exhausted, revisit the plan rather than skipping reorders of fast movers, which would cause stockouts on the items that generate the most cash. OTB is a guardrail, not a substitute for SKU-level reorder decisions.",
          ],
        ],
        formula: ["Open-to-Buy = Planned sales + Planned closing inventory − Opening inventory − Stock already on order (all at cost)"],
      },
      {
        title: "Using GMROI to rank lines",
        table: {
          head: ["Line", "Annual gross margin", "Average stock at cost", "GMROI"],
          rows: [
            ["Fast, thin margin", "$90,000", "$30,000", "3.0"],
            ["Slow, rich margin", "$40,000", "$50,000", "0.8"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: a product line earns $90,000 gross margin a year on an average $30,000 of stock at cost, a GMROI of 3. Another earns $40,000 on $50,000 of stock, a GMROI of 0.8, and is a candidate for less stock, better terms or rationalization. For open-to-buy: planned sales are $200,000 at cost, planned closing stock is $500,000, opening stock is $520,000 and $120,000 is already on order, so OTB = 200,000 + 500,000 − 520,000 − 120,000 = $60,000 left to commit.",
      ],
    ],
    why: [
      [
        "Distributors often judge lines by margin percentage alone. GMROI shows which lines actually make good use of the cash invested in them, and OTB stops purchasing running ahead of the plan across many buyers or categories.",
      ],
    ],
    mistakes: [
      ["Using inventory at selling price instead of cost."],
      ["Comparing GMROI across periods of different length."],
      ["Forgetting orders already placed in OTB, so the budget is spent twice."],
      ["Letting OTB block reorders of fast movers while slow lines use the budget."],
    ],
    inApp: [
      "Supply Chain Manager does not calculate GMROI or open-to-buy. It has one unit cost per product and no selling prices, so it cannot compute gross margin. Use your accounting data for GMROI.",
    ],
    faq: [
      {
        q: "What is a good GMROI?",
        a: ["Above 1 means a line earns back more than the stock invested in it. What is good beyond that depends on your sector, so compare lines with each other."],
      },
      {
        q: "Is open-to-buy only for retailers?",
        a: ["It began in retail, but any distributor with a monthly purchasing budget by category can use the same arithmetic."],
      },
    ],
    related: ["inventory-turnover", "inventory-carrying-cost", "abc-analysis", "demand-planning", "cash-to-cash-cycle"],
    updated: U,
  },
  {
    slug: "cash-to-cash-cycle",
    term: "Cash-to-Cash Cycle Time",
    short: "Cash-to-cash cycle",
    metaTitle: "Cash-to-Cash Cycle and Payment Terms Explained",
    category: "finance",
    definition:
      "The cash-to-cash cycle is the days between paying suppliers for stock and collecting from customers. Payment terms are one of its main levers.",
    explain: [
      [
        "It adds the days inventory sits before being sold (DIO) and the days customers take to pay (DSO), then subtracts the days you take to pay suppliers (DPO). The shorter it is, the less working capital the business needs.",
      ],
      [
        "The cycle can even be negative. A business that sells stock and collects payment before it has to pay its suppliers is effectively funded by them. Most distributors are a long way from that, but every day removed from inventory holding or customer collection, or added to supplier terms, reduces the cash needed to grow.",
      ],
    ],
    formula: ["Cash-to-Cash Cycle = DIO + DSO − DPO"],
    sections: [
      {
        title: "Payment terms: when suppliers get paid",
        paragraphs: [
          [
            "Payment terms set when a supplier invoice must be paid and any early-payment discount, for example net 30 or 2/10 net 30. Net 30 means the full amount is due 30 days after the invoice date. 2/10 net 30 means you may take a 2% discount if you pay within 10 days; otherwise the full amount is due in 30.",
          ],
          [
            "Skipping an early-payment discount is effectively borrowing from the supplier at a high rate. For 2/10 net 30, paying on day 30 instead of day 10 costs about 2% for 20 days, which works out to roughly 37% a year. Longer supplier terms fund inventory with the supplier's money, and early-payment discounts can be a better return than most uses of spare cash.",
          ],
        ],
        formula: ["Annualized cost of skipping the discount ≈ Discount ÷ (1 − Discount) × 365 ÷ (Net days − Discount days)"],
      },
      {
        title: "The three levers",
        table: {
          head: ["Lever", "Component", "Typical action"],
          rows: [
            ["Hold less stock", "DIO", "Clear slow stock; cut oversized orders; improve forecasts"],
            ["Collect faster", "DSO", "Invoice promptly; chase overdue accounts; agree terms with new customers"],
            ["Pay later, or take discounts only when worth it", "DPO", "Negotiate terms; compare discount rate with your cost of capital"],
          ],
        },
      },
      {
        title: "Why inventory is usually the biggest lever",
        paragraphs: [
          [
            "Collection and supplier terms are often constrained by customers and market practice. Inventory days are within your control: every purchase decision and every unit of overstock adds to DIO. Cutting a distributor's DIO from 61 to 50 days frees cash without any conversation with customers or suppliers. Pushing out supplier payments to improve the number, at the cost of supplier goodwill, usually backfires in a shortage.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: DIO of 61 days, customers pay in 45 (DSO) and you pay suppliers in 30 (DPO). Cash-to-cash = 61 + 45 − 30 = 76 days. Cutting DIO to 50 days shortens the cycle by 11 days without touching payment terms. For payment terms: on a $20,000 invoice at 2/10 net 30, paying by day 10 saves $400, while waiting until day 30 keeps $19,600 in your account for 20 more days at that $400 cost.",
      ],
    ],
    why: [
      [
        "For a growing distributor, a long cash cycle means growth eats cash: every extra sale needs inventory paid for well before the customer pays. Understanding the three levers shows where to find the cash.",
      ],
    ],
    mistakes: [
      ["Stretching supplier payments to improve the number, at the cost of supplier goodwill."],
      ["Ignoring how much overstock adds to DIO."],
      ["Ignoring early-payment discounts without working out their annual rate."],
      ["Paying early by default and draining cash with no discount."],
    ],
    inApp: [
      "Supply Chain Manager does not calculate the cash-to-cash cycle and does not record payment terms or invoices. It helps with the inventory part of the cycle by flagging overstock and showing the capital tied up in it.",
    ],
    faq: [
      {
        q: "Can the cash-to-cash cycle be negative?",
        a: ["Yes, when customers pay before suppliers must be paid. It is uncommon for distributors but shows suppliers financing the business."],
      },
      {
        q: "Should I always take an early-payment discount?",
        a: ["Compare the annualized discount rate with your cost of capital. A 2/10 net 30 discount works out to about 37% a year, which beats most alternatives if you have the cash."],
      },
    ],
    related: ["inventory-turnover", "inventory-carrying-cost", "total-cost-of-ownership", "three-way-match", "gmroi"],
    updated: U,
  },
  {
    slug: "inventory-write-off",
    term: "Inventory Write-Off",
    short: "Inventory write-off",
    category: "finance",
    definition:
      "An inventory write-off removes stock from the books, or cuts its value, because it has been lost, damaged, has expired or can no longer be sold.",
    explain: [
      [
        "A write-down reduces the recorded value to what the stock can realistically fetch; a write-off removes it entirely. Either way, the loss hits profit. The accounting treatment is for your accountant; the operational question is how to stop it recurring.",
      ],
      [
        "Write-offs are easier to prevent than to recover. Watching days of supply and sell-through on new or slow lines, and acting while the stock still has some value through returns, transfers or discounts, nearly always recovers more than disposing of it later.",
      ],
    ],
    sections: [
      {
        title: "Recovery options before a write-off",
        table: {
          head: ["Option", "Works when", "Typical recovery"],
          rows: [
            ["Return to supplier", "Terms allow it; stock is unopened", "Often full or partial credit"],
            ["Transfer to another warehouse", "Another site still sells it", "Full value"],
            ["Discount or bundle", "The item sells at a lower price", "Part of cost"],
            ["Sell to a liquidator", "No normal demand remains", "A small share of cost"],
            ["Dispose", "Expired or unsafe", "None; may cost money"],
          ],
        },
      },
      {
        title: "Track write-offs by cause",
        paragraphs: [
          [
            "Write-offs are the final cost of overstock and poor rotation. Tracking them by cause, such as expiry, damage, obsolescence or count variance, shows which upstream decision to change. The cause is usually found earlier in the chain: an order sized to hit a price break, a forecast that ignored a falling product, or stock that was never counted and rotated.",
          ],
          [
            "Delaying write-offs overstates inventory value and hides the problem, and writing stock off without recording the reason loses the lesson. See the ",
            guide("overstock-vs-dead-stock", "overstock versus dead stock guide"),
            " for how to spot stock early, and ",
            g("inventory-shrinkage", "inventory shrinkage"),
            " for losses found through counts.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: 500 units of an expired adhesive at $3 cost are disposed of, a $1,500 write-off. Looking back, the order that created them was three times the SKU's typical monthly sales, placed to hit a price break.",
      ],
    ],
    why: [
      [
        "Each write-off is a purchase that never earned its margin. Treating it as a signal about how the stock was bought, rather than a bookkeeping event, is what prevents the next one.",
      ],
      [
        "A practical habit is a quarterly review of the ten largest write-offs and write-downs: what was the SKU, who ordered it, how many months of demand did the order cover, and was there an earlier point at which a return, transfer or discount would have recovered value? A few such reviews usually reveal one or two repeated causes, such as buying to hit a price break on a slow line or keeping automatic reorders running on a product being replaced.",
      ],
    ],
    mistakes: [
      ["Delaying write-offs, which overstates inventory value and hides the problem."],
      ["Writing stock off without recording the reason."],
      ["Waiting until stock expires when it could have been returned, transferred or discounted earlier."],
    ],
    inApp: [
      "Supply Chain Manager flags slow-moving stock (over 180 days of supply) and stock with no recent demand, which are the earliest warnings. It does not record write-offs or their reasons.",
    ],
    faq: [
      {
        q: "What is the difference between a write-down and a write-off?",
        a: ["A write-down lowers the recorded value of stock to what it can fetch. A write-off removes it entirely. Your accountant decides which applies."],
      },
      {
        q: "Can I recover value from stock I have written off?",
        a: ["Sometimes, through a liquidator or later sale, but the value is usually small. It is better to act before the stock reaches that point."],
      },
    ],
    related: ["inventory-shrinkage", "inventory-carrying-cost", "lot-tracking", "inventory-turnover", "cycle-stock"],
    guides: ["overstock-vs-dead-stock"],
    updated: U,
  },
];
