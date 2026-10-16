import { g, type GlossaryTerm } from "./types";

const U = "2026-10-16";

export const FINANCE_TERMS: GlossaryTerm[] = [
  {
    slug: "inventory-turnover",
    term: "Inventory Turnover",
    short: "Inventory turnover",
    category: "finance",
    definition:
      "Inventory turnover is how many times inventory is sold and replaced over a period, usually a year: cost of goods sold divided by average inventory value.",
    explain: [
      [
        "Higher turnover means stock moves faster and less cash is tied up for each dollar of sales. Very high turnover can also mean stock is too thin and stockouts are frequent, so read it alongside fill rate.",
      ],
      [
        "It can be calculated in value (COGS ÷ average inventory at cost) for the business, or in units (units sold ÷ average units on hand) for a single SKU.",
      ],
    ],
    formula: [
      "Inventory Turnover = Cost of Goods Sold ÷ Average Inventory (at cost)",
      "Average Inventory = (Opening Inventory + Closing Inventory) ÷ 2",
    ],
    example: [
      [
        "Illustrative numbers: COGS of $3.6 million and average inventory of $600,000 give a turnover of 6, meaning stock turns over about every two months. Raising it to 8 at the same sales would release $150,000 of cash.",
      ],
    ],
    why: [
      [
        "Turnover is the bridge between inventory and cash. Looking at it by category or SKU shows where stock is earning its keep and where it is sitting.",
      ],
    ],
    mistakes: [
      ["Dividing sales at selling price by inventory at cost, which overstates turnover."],
      ["Comparing turnover across very different product types without context."],
    ],
    related: ["days-inventory-outstanding", "gmroi", "slow-moving-inventory", "cash-to-cash-cycle"],
    updated: U,
  },
  {
    slug: "days-inventory-outstanding",
    term: "Days Inventory Outstanding (DIO)",
    short: "DIO",
    category: "finance",
    definition:
      "Days inventory outstanding (DIO) is the average number of days a business holds inventory before selling it, based on cost of goods sold.",
    explain: [
      [
        "It is inventory turnover expressed in days, and a finance measure for the whole business or a category. Days of supply, by contrast, looks forward at a single SKU's stock against its recent sales pace.",
      ],
      [
        "Because DIO uses cost of goods sold, it is an average across the whole range. A healthy company-wide DIO can hide a few categories that hold a year of stock and others that turn every two weeks. Breaking it down by category or supplier shows where the cash is actually sitting.",
      ],
    ],
    formula: ["DIO = Average Inventory ÷ Cost of Goods Sold × 365"],
    example: [
      [
        "Illustrative numbers: average inventory of $600,000 and annual COGS of $3.6 million give DIO = 600,000 ÷ 3,600,000 × 365 ≈ 61 days.",
      ],
    ],
    why: [
      [
        "DIO is one of the three parts of the ", g("cash-to-cash-cycle", "cash-to-cash cycle"), ". Each day cut from DIO is a day less of inventory your business has to fund.",
      ],
    ],
    mistakes: [
      ["Using period-end inventory instead of an average, which swings with seasonal timing."],
      ["Confusing DIO with SKU-level days of supply."],
    ],
    related: ["inventory-turnover", "cash-to-cash-cycle", "days-of-supply", "inventory-carrying-cost"],
    updated: U,
  },
  {
    slug: "sell-through-rate",
    term: "Sell-Through Rate",
    short: "Sell-through rate",
    category: "finance",
    definition:
      "Sell-through rate is the percentage of stock received over a period that was actually sold in that period.",
    explain: [
      [
        "It is widely used in retail and for seasonal or new products: did what we bought actually sell? Low sell-through on a new line is an early sign it was over-bought.",
      ],
      [
        "Sell-through is most useful when tracked over time for the same product or season. A new line that sells through 30% in its first month and 60% in its second is behaving very differently from one that sold 40% in month one and then stalled. The trend tells you whether to reorder before the data looks conclusive.",
      ],
    ],
    formula: ["Sell-Through % = Units sold ÷ (Opening units + Units received) × 100"],
    example: [
      [
        "Illustrative numbers: 200 units on hand at the start of the season, 800 received, 650 sold. Sell-through = 650 ÷ 1,000 = 65%, leaving 350 units to clear or carry over.",
      ],
    ],
    why: [
      [
        "For distributors trialling new lines or buying for a season, sell-through shows quickly whether to reorder, hold or stop.",
      ],
    ],
    mistakes: [
      ["Measuring over too short a period for slow-selling lines."],
      ["Ignoring returns, which inflate apparent sales."],
    ],
    related: ["inventory-turnover", "open-to-buy", "anticipation-inventory", "stock-to-sales-ratio"],
    updated: U,
  },
  {
    slug: "stock-to-sales-ratio",
    term: "Stock-to-Sales Ratio",
    short: "Stock-to-sales ratio",
    category: "finance",
    definition:
      "The stock-to-sales ratio compares inventory value at the start of a period with sales in that period, showing how much stock supports each dollar of sales.",
    explain: [
      [
        "A ratio of 3 means you hold three times a month's sales in stock. It is common in retail planning and useful for comparing categories or tracking whether stock is growing faster than sales.",
      ],
      [
        "The ratio is a simple warning light. If it climbs for several months while sales are flat, stock is building somewhere, and the next step is to look at SKU-level days of supply to find where. On its own it does not say which items are the problem.",
      ],
    ],
    formula: ["Stock-to-Sales Ratio = Inventory value at start of period ÷ Sales value for the period"],
    example: [
      [
        "Illustrative numbers: $450,000 of stock at the start of the month and $150,000 of sales in that month give a ratio of 3. If sales stay flat and the ratio rises to 4 a few months later, stock is building faster than demand.",
      ],
    ],
    why: [
      [
        "It is a quick, high-level check that inventory is growing in step with the business rather than ahead of it.",
      ],
    ],
    mistakes: [
      ["Mixing inventory at cost with sales at retail price, then comparing with ratios calculated the other way."],
      ["Using it for seasonal categories without adjusting for the season."],
    ],
    related: ["inventory-turnover", "sell-through-rate", "open-to-buy", "days-inventory-outstanding"],
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
        "Textbooks often quote 20–30% of inventory value a year. Your own figure depends on interest rates, warehouse costs and how quickly your products become obsolete, so it is worth estimating rather than borrowing.",
      ],
    ],
    formula: ["Annual Carrying Cost = Average Inventory Value × Carrying Cost Rate (% per year)"],
    example: [
      [
        "Illustrative numbers: $600,000 of average inventory at a 25% carrying rate costs about $150,000 a year to hold. Every $10,000 of stock you do not need costs roughly $2,500 a year.",
      ],
    ],
    why: [
      [
        "Carrying cost is what makes overstock expensive. It is the number to compare against a quantity discount, a forward buy or a higher service level.",
      ],
    ],
    mistakes: [
      ["Counting only warehouse rent and ignoring the cost of capital."],
      ["Using one rate for perishable and durable goods alike."],
    ],
    related: ["ordering-cost", "economic-order-quantity", "quantity-break", "obsolete-inventory"],
    guides: ["overstock-vs-dead-stock"],
    updated: U,
  },
  {
    slug: "ordering-cost",
    term: "Ordering Cost",
    short: "Ordering cost",
    category: "finance",
    definition:
      "Ordering cost is the cost of placing and receiving one purchase order, such as buyer time, approvals, receiving, invoice handling and fixed freight charges.",
    explain: [
      [
        "It is a cost per order, not per unit, so it falls per unit as order size grows. That is the force pulling towards larger, less frequent orders, balanced by carrying cost pulling the other way in the ",
        g("economic-order-quantity", "EOQ"),
        " model.",
      ],
      [
        "Ordering cost is easy to underestimate because it is spread across several people: the buyer who raises the order, the manager who approves it, the receiving team, and accounts payable who match and pay the invoice. Adding up the minutes at each step usually gives a larger figure than expected.",
      ],
    ],
    formula: ["Annual Ordering Cost = Number of orders per year × Cost per order"],
    example: [
      [
        "Illustrative numbers: if raising, receiving and paying for a PO takes about 90 minutes of staff time at $30 an hour, plus a $15 fixed delivery charge, each order costs about $60. Ordering one SKU weekly instead of monthly adds roughly 40 orders, or $2,400 a year.",
      ],
    ],
    why: [
      [
        "Automating PO creation lowers the cost per order, which makes smaller, more frequent orders economic and reduces stock without more work.",
      ],
    ],
    mistakes: [
      ["Leaving ordering cost out of order-size decisions entirely."],
      ["Assuming it is the same for every supplier, when freight terms vary widely."],
    ],
    related: ["inventory-carrying-cost", "economic-order-quantity", "cycle-stock", "purchase-order"],
    updated: U,
  },
  {
    slug: "stockout-cost",
    term: "Stockout Cost",
    short: "Stockout cost",
    category: "finance",
    definition:
      "Stockout cost is the total cost of running out of stock: lost margin, backorder handling, expediting, penalties and damage to customer relationships.",
    explain: [
      [
        "Some parts are easy to measure, like expedite freight and lost margin. Others are not, like customers who quietly move future orders elsewhere. Even a rough estimate helps when deciding how much safety stock a SKU deserves.",
      ],
      [
        "Stockout costs differ widely by customer and product. A missing consumable for a walk-in customer may cost one sale; a missing line on a large contractor's project order can put the whole account at risk. Assigning higher service levels to the items and customers where stockouts are most costly is how carrying cost is spent wisely.",
      ],
    ],
    formula: ["Stockout Cost ≈ Lost margin + Backorder handling + Expediting + Penalties + Estimated lost future sales"],
    example: [
      [
        "Illustrative numbers: a 5-day stockout on a SKU with $12 margin a unit and 30 units a day of demand. If half the demand is lost ($900), backorders cost $5 each to handle (75 × $5 = $375), and one $300 expedite is needed, the visible cost is $1,575 before any lost customer goodwill.",
      ],
    ],
    why: [
      [
        "Comparing stockout cost with carrying cost is how you set sensible service levels: high for items where running out is expensive, lower where it is not.",
      ],
    ],
    mistakes: [
      ["Treating stockout cost as zero because it never appears on an invoice."],
      ["Using one stockout cost for every SKU and customer."],
    ],
    related: ["stockout", "lost-sales", "service-level", "expediting", "inventory-carrying-cost"],
    updated: U,
  },
  {
    slug: "landed-cost",
    term: "Landed Cost",
    short: "Landed cost",
    category: "finance",
    definition:
      "Landed cost is the full cost of getting a product into your warehouse: purchase price plus freight, insurance, duties, taxes, brokerage and handling.",
    explain: [
      [
        "For imported goods, the extras can be a large share of the unit price. Margins, pricing and supplier comparisons are only accurate when they use landed cost rather than the supplier's price.",
      ],
      [
        "Freight and duty can be allocated by units, weight, volume or value. The right basis depends on what drives the cost: freight usually follows weight or volume, duty usually follows value. Using a single per-unit allocation for a mixed container can make small, light items look more expensive than they are and heavy items cheaper.",
      ],
    ],
    formula: ["Landed Cost per Unit = (Purchase cost + Freight + Insurance + Duties & taxes + Brokerage + Handling) ÷ Units received"],
    example: [
      [
        "Illustrative numbers: 2,000 units at $5.00 ($10,000), plus $1,400 freight, $100 insurance, $600 duty and $200 brokerage. Landed cost = $12,300 ÷ 2,000 = $6.15 a unit, 23% above the supplier price.",
      ],
    ],
    why: [
      [
        "A product that looks profitable at supplier price may not be at landed cost. It also changes which supplier is really cheapest, especially between domestic and imported options.",
      ],
    ],
    mistakes: [
      ["Pricing from the supplier's price list instead of landed cost."],
      ["Spreading freight evenly by unit when products differ greatly in weight or volume."],
    ],
    related: ["incoterms", "total-cost-of-ownership", "purchase-price-variance", "less-than-truckload"],
    updated: U,
  },
  {
    slug: "fifo",
    term: "FIFO (First In, First Out)",
    short: "FIFO",
    category: "finance",
    definition:
      "FIFO (first in, first out) assumes the oldest stock is sold first, both as a physical picking rule and as a method of valuing inventory and cost of goods sold.",
    explain: [
      [
        "As a valuation method, FIFO charges the oldest purchase costs to cost of goods sold, so remaining inventory is valued at the most recent costs. When prices are rising, that gives lower COGS and higher reported profit than LIFO.",
      ],
      [
        "Physically, FIFO rotation keeps older stock moving so it does not age on the shelf.",
      ],
    ],
    example: [
      [
        "Illustrative numbers: you bought 100 units at $4 and then 100 at $5, and sold 150. Under FIFO, COGS = 100 × $4 + 50 × $5 = $650, and the 50 units left are valued at $5 each ($250).",
      ],
    ],
    why: [
      [
        "FIFO is permitted under both IFRS and US GAAP and is widely used. Your accountant chooses the valuation method; it affects reported margin and inventory value, not what is physically on the shelf.",
      ],
    ],
    mistakes: [
      ["Assuming the valuation method has to match physical picking order."],
      ["Ignoring FEFO for dated goods, where expiry matters more than arrival order."],
    ],
    related: ["lifo", "weighted-average-cost", "fefo", "landed-cost"],
    updated: U,
  },
  {
    slug: "lifo",
    term: "LIFO (Last In, First Out)",
    short: "LIFO",
    category: "finance",
    definition:
      "LIFO (last in, first out) is an inventory valuation method that charges the most recent purchase costs to cost of goods sold first.",
    explain: [
      [
        "When prices rise, LIFO gives higher COGS and lower taxable profit than FIFO, which is why some US businesses use it. It is not permitted under IFRS, and in the US it is subject to specific tax and reporting rules, so it is a decision for your accountant.",
      ],
    ],
    example: [
      [
        "Illustrative numbers: the same 100 units at $4 then 100 at $5, with 150 sold. Under LIFO, COGS = 100 × $5 + 50 × $4 = $700, and the 50 units left are valued at the older $4 cost ($200).",
      ],
    ],
    why: [
      [
        "For planning, the valuation method does not change how much stock you have or need. It changes reported margins and inventory value, which matters when comparing figures across businesses or periods.",
      ],
    ],
    mistakes: [
      ["Comparing gross margins between a LIFO and a FIFO business without adjusting."],
      ["Confusing LIFO valuation with physically shipping the newest stock first."],
    ],
    related: ["fifo", "weighted-average-cost", "inventory-turnover", "landed-cost"],
    updated: U,
  },
  {
    slug: "weighted-average-cost",
    term: "Weighted Average Cost",
    short: "Weighted average cost",
    category: "finance",
    definition:
      "Weighted average cost values every unit of a SKU at the average cost of all units held, recalculated as new stock is bought at different prices.",
    explain: [
      [
        "It smooths out price changes between purchases, so cost of goods sold sits between FIFO and LIFO when prices move. Many inventory and ERP systems use a moving average that updates on every receipt.",
      ],
      [
        "With a perpetual moving average, the average is recalculated each time stock is received. With a periodic weighted average, it is recalculated at the end of a period from all purchases in that period. Inventory systems usually use the moving version, because it keeps cost of goods sold current on every sale.",
      ],
    ],
    formula: ["Average Cost = (Existing units × Existing average cost + New units × New unit cost) ÷ Total units"],
    example: [
      [
        "Illustrative numbers: 100 units at $4 plus 100 units at $5 give an average cost of $4.50. Selling 150 units gives COGS of $675, and the remaining 50 are valued at $4.50 each.",
      ],
    ],
    why: [
      [
        "Average cost is simple and stable, which makes margin reporting easier to read. It is also a common baseline for spotting price variance on new purchase orders.",
      ],
    ],
    mistakes: [
      ["Leaving freight and duties out, so the average understates true cost."],
      ["Letting stock adjustments at zero cost distort the average."],
    ],
    related: ["fifo", "lifo", "landed-cost", "purchase-price-variance"],
    updated: U,
  },
  {
    slug: "gmroi",
    term: "GMROI (Gross Margin Return on Inventory Investment)",
    short: "GMROI",
    category: "finance",
    definition:
      "GMROI (gross margin return on inventory investment) is the gross margin earned per dollar of average inventory held at cost over a period, usually a year.",
    explain: [
      [
        "It combines margin and turnover in one number. A low-margin SKU that turns fast can earn the same GMROI as a high-margin SKU that turns slowly. Below 1 means the item earns less in a year than the money tied up in it.",
      ],
      [
        "GMROI is particularly useful when deciding which product lines deserve more shelf space or investment. A line with a modest margin percentage but fast turnover can return more gross margin per dollar of stock than a premium line that sits for months. Comparing lines on GMROI rather than margin percentage often changes the ranking.",
      ],
    ],
    formula: ["GMROI = Annual Gross Margin ÷ Average Inventory at Cost"],
    example: [
      [
        "Illustrative numbers: a product line earns $90,000 gross margin a year on an average $30,000 of stock at cost, a GMROI of 3. Another earns $40,000 on $50,000 of stock, a GMROI of 0.8, and is a candidate for less stock, better terms or rationalization.",
      ],
    ],
    why: [
      [
        "Distributors often judge lines by margin percentage alone. GMROI shows which lines actually make good use of the cash invested in them.",
      ],
    ],
    mistakes: [
      ["Using inventory at selling price instead of cost."],
      ["Comparing GMROI across periods of different length."],
    ],
    related: ["inventory-turnover", "sku-rationalization", "inventory-carrying-cost", "abc-analysis"],
    updated: U,
  },
  {
    slug: "cash-to-cash-cycle",
    term: "Cash-to-Cash Cycle Time",
    short: "Cash-to-cash cycle",
    category: "finance",
    definition:
      "The cash-to-cash cycle is the number of days between paying suppliers for stock and collecting cash from customers for selling it.",
    explain: [
      [
        "It adds the days inventory sits before being sold (DIO) and the days customers take to pay (DSO), then subtracts the days you take to pay suppliers (DPO). The shorter it is, the less working capital the business needs.",
      ],
      [
        "The cycle can even be negative. A business that sells stock and collects payment before it has to pay its suppliers is effectively funded by them. Most distributors are a long way from that, but every day removed from inventory holding, customer collection or added to supplier terms reduces the cash needed to grow.",
      ],
    ],
    formula: ["Cash-to-Cash Cycle = DIO + DSO − DPO"],
    example: [
      [
        "Illustrative numbers: DIO of 61 days, customers pay in 45 (DSO) and you pay suppliers in 30 (DPO). Cash-to-cash = 61 + 45 − 30 = 76 days. Cutting DIO to 50 days shortens the cycle by 11 days without touching payment terms.",
      ],
    ],
    why: [
      [
        "For a growing distributor, a long cash cycle means growth eats cash: every extra sale needs inventory paid for well before the customer pays. Inventory is usually the biggest lever.",
      ],
    ],
    mistakes: [
      ["Stretching supplier payments to improve the number, at the cost of supplier goodwill."],
      ["Ignoring how much overstock adds to DIO."],
    ],
    related: ["days-inventory-outstanding", "payment-terms", "inventory-turnover", "inventory-carrying-cost"],
    updated: U,
  },
  {
    slug: "open-to-buy",
    term: "Open-to-Buy (OTB)",
    short: "Open-to-buy",
    category: "finance",
    definition:
      "Open-to-buy (OTB) is the budget left for new purchases in a period after planned sales, planned closing stock and orders already placed are accounted for.",
    explain: [
      [
        "It comes from retail merchandise planning, but the idea suits any distributor managing a stock budget: you can only buy what the plan says you will sell, plus any planned change in stock, minus what is already on order.",
      ],
      [
        "In distribution, open-to-buy is often set at category or supplier level each month. Within that budget, SKU-level reorder rules decide what to buy. If the budget is exhausted, the plan should be revisited rather than skipping reorders of fast movers, which would cause stockouts on the items that generate the most cash.",
      ],
    ],
    formula: ["Open-to-Buy = Planned sales + Planned closing inventory − Opening inventory − Stock already on order (all at cost)"],
    example: [
      [
        "Illustrative numbers: for next month, planned sales are $200,000 at cost, planned closing stock is $500,000, opening stock is $520,000 and $120,000 is already on order. OTB = 200,000 + 500,000 − 520,000 − 120,000 = $60,000 left to commit.",
      ],
    ],
    why: [
      [
        "OTB stops purchasing from running ahead of the plan, especially across many buyers or product categories. It is a guardrail, not a substitute for SKU-level reorder decisions.",
      ],
    ],
    mistakes: [
      ["Forgetting orders already placed, so the budget is spent twice."],
      ["Letting OTB block reorders of fast movers while slow lines use the budget."],
    ],
    related: ["sales-and-operations-planning", "stock-to-sales-ratio", "sell-through-rate", "anticipation-inventory"],
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
    example: [
      [
        "Illustrative numbers: 500 units of an expired adhesive at $3 cost are disposed of, a $1,500 write-off. Looking back, the order that created them was three times the SKU's typical monthly sales, placed to hit a price break.",
      ],
    ],
    why: [
      [
        "Write-offs are the final cost of overstock and poor rotation. Tracking them by cause, such as expiry, damage, obsolescence or count variance, shows which upstream decision to change.",
      ],
    ],
    mistakes: [
      ["Delaying write-offs, which overstates inventory value and hides the problem."],
      ["Writing stock off without recording the reason."],
    ],
    related: ["obsolete-inventory", "inventory-shrinkage", "fefo", "slow-moving-inventory"],
    guides: ["overstock-vs-dead-stock"],
    updated: U,
  },
];
