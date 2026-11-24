import { g, guide, type GlossaryTerm } from "./types";

const U = "2026-11-24";

/**
 * Inventory-planning terms, consolidated from 21 pages to 10 fuller ones
 * (docs/seo/glossary-merge-map.json). Removed slugs are redirected in
 * merged.ts. Product statements (`inApp`) were checked against
 * src/lib/metrics/inventory.ts and the forecasting service on 2026-11-24.
 */
export const INVENTORY_TERMS: GlossaryTerm[] = [
  {
    slug: "average-daily-demand",
    term: "Average Daily Demand",
    short: "Average daily demand",
    category: "inventory",
    definition:
      "Average daily demand is how many units of a SKU leave a warehouse on a typical day, measured from recent actual outbound movement rather than a guess.",
    explain: [
      [
        "Almost every replenishment number starts here. Days of supply, the reorder point, safety stock and overstock thresholds all multiply or divide by it, so an error in average daily demand flows straight into every purchasing decision built on top of it.",
      ],
      [
        "Measure it per SKU per warehouse, not per SKU across the company. A product can sell quickly from one location and barely move from another, and a single company-wide average hides both problems.",
      ],
    ],
    formula: ["Average Daily Demand = units shipped out over the window ÷ days in the window"],
    sections: [
      {
        title: "Choosing the window",
        paragraphs: [
          [
            "A window that is too short lets one large order dominate the result. A window that is too long misses a real trend. Many distributors start with 60 to 90 days and shorten it for fast movers or lengthen it for slow ones. Whatever you choose, use the same window for every SKU you compare, and count days of history rather than calendar days for new products.",
          ],
          [
            "A product first sold 10 days ago has 10 days of history, not 90. Dividing its sales by 90 treats the days before it existed as zero sales and understates demand by almost an order of magnitude.",
          ],
        ],
      },
      {
        title: "Cleaning the number before you use it",
        bullets: [
          ["Stockout days: if the SKU was out of stock, those days show zero sales even though customers wanted it. Exclude them or estimate the lost demand, or the rate will be too low. See ", g("stockout", "stockout"), "."],
          ["One-off bulk orders: a single 300-unit order can dwarf a month of normal sales. Trim or cap it so it does not inflate future orders."],
          ["Transfers: stock moved out to another warehouse empties this shelf as surely as a sale does, so count it as demand at the sending site."],
          ["No movement at all: treat it as 'no recent demand', which is its own problem (possible dead stock), not as a demand of zero to plan around."],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: a warehouse shipped 630 units of a SKU over the last 90 days. Average daily demand = 630 ÷ 90 = 7 units per day. If the item was only in stock for 60 of those days, dividing by 60 gives 10.5 units per day, which is the better estimate of true demand when stockouts suppressed sales.",
      ],
    ],
    why: [
      [
        "Distributors usually carry thousands of SKUs, so nobody can eyeball demand item by item. A consistent, data-driven daily rate lets you rank which SKUs are about to run short and how much to order, without a planner re-deriving it in a spreadsheet each week.",
      ],
    ],
    mistakes: [
      ["Counting only sales and ignoring transfers out to other warehouses, which also empty this shelf."],
      ["Treating a SKU with no movement as demand of zero and moving on. No recent demand is its own problem: possible ", g("obsolete-inventory", "obsolete stock"), "."],
      ["Using a window so short that one large order dominates it, or so long that it misses a real trend."],
      ["Dividing a new product's sales by a full window of days it did not exist."],
    ],
    inApp: [
      "Supply Chain Manager calculates it per SKU per warehouse from outbound movement in the trailing 90 days, using a trimmed mean that drops the top and bottom 5% of active sales days so a one-off bulk order does not distort it. A new product is divided by its days of history, not by 90. With no movement it shows no demand, never a made-up figure.",
    ],
    faq: [
      {
        q: "How many days of history should I use?",
        a: ["Sixty to ninety days is a common starting point. Use a shorter window for fast sellers and a longer one for slow sellers, and test the choice against how well it predicted the following weeks."],
      },
      {
        q: "Should average daily demand include weekends?",
        a: ["Divide by the days you actually ship. If you are closed on weekends, count only open days, or your rate will be too low for the days that matter."],
      },
    ],
    related: ["days-of-supply", "lead-time", "service-level", "exponential-smoothing", "forecast-accuracy"],
    guides: ["reorder-point-formula", "safety-stock-formula"],
    updated: U,
  },
  {
    slug: "days-of-supply",
    term: "Days of Supply",
    short: "Days of supply",
    category: "inventory",
    definition:
      "Days of supply (or days of stock) is how many days current inventory will last at the recent sales pace before the SKU runs out.",
    explain: [
      [
        "It turns a raw unit count into time, which is what purchasing actually reasons about. 400 units means nothing on its own; 400 units that last 6 days against a 14-day supplier lead time is an emergency. Retailers often express the same idea in weeks (weeks of supply). The calculation is identical; only the unit changes.",
      ],
    ],
    formula: ["Days of Supply = Available Inventory ÷ Average Daily Demand"],
    sections: [
      {
        title: "Reading days of supply against lead time",
        paragraphs: [
          [
            "Comparing days of supply with ",
            g("lead-time", "supplier lead time"),
            " is the quickest way to triage a long SKU list. Anything with fewer days of supply than lead time is already late: even if you order today, the shelf empties before the delivery arrives. Anything with several hundred days ties up cash.",
          ],
        ],
        table: {
          head: ["Days of supply vs lead time", "Reading", "Typical action"],
          rows: [
            ["Less than the lead time", "Already late: a stockout is likely before a new order lands", "Expedite, or transfer from a warehouse with surplus"],
            ["About one to two lead times", "Order now or soon", "Raise the purchase order"],
            ["Several lead times", "Comfortable", "No action; check the next review"],
            ["Hundreds of days", "Overstocked or slow-moving", "Stop reordering; consider clearing"],
          ],
        },
      },
      {
        title: "Adjust for stock you cannot sell and stock on the way",
        paragraphs: [
          [
            "Use available stock, not raw on-hand stock, so units already promised to customers are not counted twice (see ",
            g("quantity-on-hand", "quantity on hand and available stock"),
            "). When you plan an order, also credit open purchase orders that will really arrive. An order whose expected date has already passed is not evidence of stock in transit.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: 84 units available, selling 21 a day. Days of supply = 84 ÷ 21 = 4 days. If the supplier needs 8 days to deliver, an order placed today still leaves roughly 4 days with nothing on the shelf, unless you expedite or transfer stock from another warehouse.",
      ],
    ],
    why: [
      [
        "A single days-of-supply column lets one person scan thousands of SKUs and see which ones need action this week. It is also the measure that exposes stock in the wrong warehouse: a healthy network total can hide a branch that is days from empty.",
      ],
    ],
    mistakes: [
      ["Dividing by zero demand and reporting infinite days. A SKU with no demand needs a different review, not an infinite number."],
      ["Using on-hand instead of available stock, so units already promised to customers are counted twice."],
      ["Looking at one company-wide number when stock sits in the wrong warehouse."],
      ["Treating an overdue purchase order as stock that is about to arrive."],
    ],
    inApp: [
      "Supply Chain Manager shows days of stock for every SKU and warehouse, calculated from the quantity on hand and the SKU's trimmed average daily demand. It flags 3 days or fewer as stock-out risk and more than 180 days as slow-moving. The app does not track allocations or holds, so on-hand quantity is the starting figure.",
    ],
    faq: [
      {
        q: "What is a good number of days of supply?",
        a: ["There is no universal answer. A sensible floor is the supplier lead time plus a safety buffer; a sensible ceiling depends on shelf life, cash and how fast the item sells."],
      },
      {
        q: "What is the difference between days of supply and inventory turnover?",
        a: ["Days of supply looks forward from current stock at the current pace. Inventory turnover looks back at how many times stock sold through over a period. They are two views of the same speed."],
      },
    ],
    related: ["average-daily-demand", "lead-time", "quantity-on-hand", "stockout", "service-level"],
    guides: ["reorder-expedite-or-transfer", "overstock-vs-dead-stock"],
    updated: U,
  },
  {
    slug: "lead-time",
    term: "Lead Time",
    short: "Lead time",
    metaTitle: "Lead Time, Lead Time Demand and Variability Explained",
    category: "inventory",
    definition:
      "Lead time is the time from deciding to replenish a SKU to having the goods available to sell, usually counted in days from purchase order to receipt.",
    explain: [
      [
        "For a distributor the main component is supplier lead time: how long the supplier takes to ship plus transit. Internal steps add to it: time to approve and send the purchase order, and time to receive, check and put the goods away.",
      ],
      [
        "Quoted lead time and actual lead time are often different. Planning on the quoted number when the supplier routinely runs late is one of the most common causes of stockouts.",
      ],
    ],
    formula: ["Lead Time = Date goods are available to sell − Date the replenishment decision was made"],
    sections: [
      {
        title: "Lead time demand: what you sell while you wait",
        paragraphs: [
          [
            "Lead time demand is the quantity you expect to sell while waiting for a replenishment order to arrive. It is the first half of the reorder point. If stock on hand when you order is less than lead time demand, you run out before the delivery lands, even if the supplier is perfectly on time.",
          ],
          [
            "It is an average. Demand during the lead time varies from cycle to cycle, and the lead time itself varies too, which is why the ",
            guide("reorder-point-formula", "reorder point"),
            " adds safety stock on top. Lead time demand covers the expected case; safety stock covers the cycles where demand runs higher or the supplier runs late. Doubling lead time doubles the stock you must hold just to bridge the wait, before any buffer.",
          ],
        ],
        formula: ["Lead Time Demand = Average Daily Demand × Lead Time (days)"],
      },
      {
        title: "Lead time variability: the average hides the late deliveries",
        paragraphs: [
          [
            "Two suppliers can both average 10 days. One delivers in 9 to 11; the other in 5 to 20. The second needs far more safety stock, because you must plan for the late deliveries, not the average. Variability, more than the average, causes stockouts.",
          ],
          [
            "Measuring it needs only three dates per purchase order: when it was placed, when it was expected and when it arrived. From those you can calculate each supplier's average lead time and its spread, and see whether late deliveries are random or concentrated on particular items or seasons. Reducing variability, by changing supplier, agreeing delivery windows or ordering earlier, often cuts safety stock more than any forecasting change.",
          ],
        ],
        formula: ["Lead Time Variability = Standard Deviation of actual lead times (days)"],
      },
    ],
    example: [
      [
        "Illustrative numbers: a supplier quotes 10 days. Your last five receipts took 9, 12, 14, 11 and 13 days from order date, an average of 11.8 days. Add one day to raise and approve the order and one day to receive and put away, and the planning lead time is closer to 14 days than 10. At 21 units a day, lead time demand is 21 × 14 = 294 units. Supplier A's last receipts took 9, 10, 11, 10 and 10 days (standard deviation about 0.7) while supplier B's took 5, 18, 7, 20 and 10 days (about 6), so B needs much more buffer for the same average.",
      ],
    ],
    why: [
      [
        "Lead time sets how far ahead you have to see. The longer it is, the more stock you need to cover demand while you wait, and the more expensive a forecast error becomes. Cutting lead time is often a cheaper way to lower inventory than squeezing safety stock.",
      ],
    ],
    mistakes: [
      ["Using the supplier's quoted lead time instead of measured receipts."],
      ["Ignoring internal time to approve, send and receive orders."],
      ["Using only the average lead time in safety stock, which hides the late deliveries that cause stockouts."],
      ["Multiplying monthly demand by a lead time in days without converting the units."],
      ["Judging a supplier on a handful of receipts."],
    ],
    inApp: [
      "Supply Chain Manager uses each supplier's lead time in its safety stock and reorder point (reorder point = daily demand × (lead time + 1 review day) + safety stock) and tracks actual purchase-order cycle time so you can compare the quote with reality.",
    ],
    faq: [
      {
        q: "What is the difference between lead time and transit time?",
        a: ["Transit time is only the shipping leg. Lead time runs from the decision to order to goods being sellable, so it also includes approval, supplier processing, receiving and put-away."],
      },
      {
        q: "How do I measure supplier lead time?",
        a: ["Record the order date and the actual receipt date for every purchase order, then take the average and the standard deviation by supplier."],
      },
    ],
    related: ["average-daily-demand", "days-of-supply", "service-level", "po-cycle-time", "forecast-accuracy"],
    guides: ["reorder-point-formula", "safety-stock-formula"],
    updated: U,
  },
  {
    slug: "economic-order-quantity",
    term: "Economic Order Quantity (EOQ)",
    short: "EOQ",
    metaTitle: "EOQ, MOQ, Order Cost and Quantity Breaks Explained",
    category: "inventory",
    definition:
      "Economic order quantity (EOQ) is the order size that minimizes yearly ordering and holding cost for a SKU with steady demand. MOQs and price breaks adjust it.",
    explain: [
      [
        "Ordering often in small amounts keeps stock low but racks up ordering costs. Ordering rarely in big amounts saves on orders but raises ",
        g("inventory-carrying-cost", "carrying costs"),
        ". EOQ is the textbook balance point between the two.",
      ],
      [
        "The model assumes steady demand, a fixed cost per order and a fixed holding cost per unit. Real distributors rarely meet all three, so treat EOQ as a sensible starting point, then adjust for minimum order quantities, price breaks, pallet sizes and shelf life.",
      ],
    ],
    formula: [
      "EOQ = √( 2 × D × S ÷ H )",
      "D = annual demand in units",
      "S = cost of placing one order",
      "H = cost of holding one unit for a year",
    ],
    sections: [
      {
        title: "Ordering cost: the S in the formula",
        paragraphs: [
          [
            "Ordering cost is the cost of placing and receiving one purchase order: buyer time, approvals, receiving, invoice handling and fixed freight. It is a cost per order, not per unit, so it falls per unit as order size grows. That is the force pulling towards larger orders, balanced by carrying cost pulling the other way.",
          ],
          [
            "It is easy to underestimate because it is spread across people: the buyer who raises the order, the manager who approves it, the receiving team, and accounts payable who match and pay the invoice. Adding up the minutes at each step usually gives a larger figure than expected, and freight terms vary by supplier. Automating purchase order creation lowers the cost per order, which makes smaller, more frequent orders economic.",
          ],
        ],
        formula: ["Annual Ordering Cost = Number of orders per year × Cost per order"],
      },
      {
        title: "Minimum order quantity (MOQ)",
        paragraphs: [
          [
            "A minimum order quantity is the smallest quantity a supplier accepts on one order line, set in units, cases or order value. Suppliers set MOQs to cover their own setup, picking and shipping costs. For the buyer, an MOQ larger than what you need forces a choice: order more than needed, combine the item with other orders, or find another source. MOQs are a common hidden source of slow-moving stock.",
          ],
        ],
        formula: ["Order Quantity = max(Calculated Need, MOQ), rounded up to the case or pack size"],
      },
      {
        title: "Quantity breaks: when a bigger order is cheaper",
        paragraphs: [
          [
            "A quantity break is a lower unit price when you buy at or above a set quantity. Breaks reward bigger orders, but bigger orders mean more stock, so compare the saving on the purchase with the extra carrying cost of holding the additional units until they sell. Breaks can also apply across SKUs from the same supplier on total order value, in which case adding a few fast movers to an order can earn the break without overstocking any single line.",
          ],
        ],
        formula: [
          "Saving = (Price below break − Price at break) × Quantity at break",
          "Extra carrying cost ≈ Extra average stock × Unit cost × Annual carrying rate × Holding time (years)",
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: annual demand of 5,000 units, $50 to place an order and $2.50 a year to hold one unit. EOQ = √(2 × 5,000 × 50 ÷ 2.5) = √200,000 ≈ 447 units, or roughly 11 orders a year. Now a quantity break: you need 300 units a month, and ordering 500 instead of 300 earns $0.40 off each, a $200 saving. The extra 200 units take about two-thirds of a month to sell; at a 25% annual carrying rate on $4.00 that costs roughly $11, so the break is worth taking. For a slow seller needing 120 units against an MOQ of 500, the same carrying-cost arithmetic usually says no.",
      ],
    ],
    why: [
      [
        "EOQ gives a defensible default order size instead of 'whatever we ordered last time'. For high-volume, stable SKUs, moving towards EOQ can trim both order handling and cash tied up in stock. Knowing which SKUs are MOQ-bound helps you negotiate lower minimums, consolidate orders or move the item to a supplier that sells smaller quantities.",
      ],
    ],
    mistakes: [
      ["Applying EOQ to lumpy or seasonal items where its steady-demand assumption fails."],
      ["Guessing the holding cost. It drives the answer, so estimate it from real storage, capital and obsolescence costs."],
      ["Letting the MOQ silently become the reorder quantity for every order."],
      ["Chasing quantity breaks on slow movers and creating overstock, or ignoring storage space and shelf-life limits."],
      ["Leaving ordering cost out of order-size decisions entirely, or assuming it is the same for every supplier."],
    ],
    inApp: [
      "Supply Chain Manager suggests purchase order quantities from forecast demand and supplier lead time. It does not calculate EOQ or apply MOQs and price breaks, so check suggested quantities against supplier minimums before creating an order.",
    ],
    faq: [
      {
        q: "Is EOQ still useful for a distributor?",
        a: ["As a starting point for steady, high-volume SKUs, yes. For lumpy, seasonal or MOQ-bound items its assumptions fail and you need judgment or a different policy."],
      },
      {
        q: "How do I estimate the holding cost H?",
        a: ["Add capital cost, storage, insurance, handling and expected obsolescence, as a percentage of unit value per year. Many distributors land in the 20% to 30% range, but use your own figures."],
      },
    ],
    related: ["inventory-carrying-cost", "cycle-stock", "min-max-inventory", "lead-time", "total-cost-of-ownership"],
    updated: U,
  },
  {
    slug: "min-max-inventory",
    term: "Min/Max Inventory",
    short: "Min/max",
    metaTitle: "Min/Max, Periodic and Continuous Review Systems",
    category: "inventory",
    definition:
      "Min/max is a replenishment rule: when stock falls to the minimum, order back up to the maximum. Periodic and continuous review are the two timing styles.",
    explain: [
      [
        "The minimum works like a reorder point and the maximum caps how much you hold. It is simple, easy to explain to a warehouse team and supported by almost every ERP and inventory system.",
      ],
      [
        "Its weakness is that the levels are often set once and forgotten. When demand or lead time changes, a static min and max quietly drift into stockouts or overstock. Set the min from lead time demand plus safety stock, and recalculate both levels regularly from real demand.",
      ],
    ],
    formula: ["When Inventory Position ≤ Min:  Order Quantity = Max − Inventory Position"],
    sections: [
      {
        title: "Continuous review: order the moment stock crosses the line",
        paragraphs: [
          [
            "A continuous review system watches each SKU's stock all the time and places a fixed-size order the moment it falls to the reorder point. It is also called a fixed-order-quantity or (s, Q) system. The order size stays the same and the timing varies. Because it reacts as soon as stock crosses the trigger, it needs less safety stock than a periodic system for the same service level.",
          ],
          [
            "It used to require constant manual checking, so it was reserved for the most important items. With live inventory data, software can watch every SKU continuously. For fast movers and A-class items, reacting the day stock crosses the line rather than at the next weekly review is often the difference between a near miss and a stockout.",
          ],
        ],
        formula: ["When Inventory Position ≤ Reorder Point: order a fixed quantity Q (often the EOQ)"],
      },
      {
        title: "Periodic review: check on a schedule and order up to a target",
        paragraphs: [
          [
            "A periodic review system checks stock at fixed intervals, such as every Monday, and orders enough to bring each SKU up to a target level. It is also called a fixed-interval or order-up-to system. Because orders go out on a schedule, it suits suppliers with weekly delivery runs and makes it easy to group many SKUs from the same supplier onto one purchase order, which helps hit freight minimums and quantity breaks.",
          ],
          [
            "The trade-off is that a SKU can fall dangerously low between reviews, so the target level has to cover demand for the review period plus the lead time.",
          ],
        ],
        formula: [
          "Order-up-to Level = Average Daily Demand × (Review Period + Lead Time) + Safety Stock",
          "Order Quantity = Order-up-to Level − Inventory Position",
        ],
      },
      {
        title: "Which to use",
        table: {
          head: ["", "Continuous review", "Periodic review"],
          rows: [
            ["Trigger", "Stock reaches the reorder point", "A fixed review day"],
            ["Order size", "Fixed (often EOQ)", "Varies: order up to a target"],
            ["Safety stock", "Lower: covers lead time only", "Higher: covers lead time plus review period"],
            ["Best for", "Fast movers and A items", "Grouping many SKUs per supplier; weekly delivery runs"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: min 200, max 600. Stock on hand plus on order drops to 180, so the order is 600 − 180 = 420 units. If demand has doubled since the levels were set, that 200-unit minimum may now cover only half the lead time. For periodic review: 20 units a day, weekly review (7 days), 5-day lead time and 60 units of safety stock give an order-up-to level of 20 × 12 + 60 = 300; with an inventory position of 110 on review day, order 190.",
      ],
    ],
    why: [
      [
        "Min/max is often the starting point for distributors moving off pure gut feel, and the choice between continuous and periodic review is mostly a question of how your suppliers deliver. Keeping the levels tied to measured demand and lead time is what keeps either rule honest.",
      ],
    ],
    mistakes: [
      ["Setting levels once and never recalculating them."],
      ["Using on-hand stock instead of inventory position, which triggers duplicate orders while a PO is already in transit."],
      ["Using the same min and max across warehouses with very different demand."],
      ["Covering only the lead time in a periodic system and forgetting the review period."],
    ],
    inApp: [
      "Supply Chain Manager works as a continuous review on a 1-day cycle: it recalculates each SKU's reorder point daily (daily demand × (lead time + 1 day) + safety stock) from recent demand and the supplier's lead time, instead of a static min and max. It does not let you set manual min/max levels.",
    ],
    faq: [
      {
        q: "What is the difference between min/max and a reorder point?",
        a: ["A reorder point triggers an order, usually of a fixed or calculated size. Min/max also defines how much to order: enough to reach the maximum."],
      },
      {
        q: "How often should min and max levels be reviewed?",
        a: ["At least whenever demand or lead time changes noticeably, and for fast movers monthly. A static level that nobody revisits is the main failure mode."],
      },
    ],
    related: ["economic-order-quantity", "lead-time", "service-level", "quantity-on-hand", "cycle-stock"],
    guides: ["reorder-point-formula"],
    updated: U,
  },
  {
    slug: "service-level",
    term: "Service Level",
    short: "Service level",
    category: "inventory",
    definition:
      "Service level (cycle service level) is the probability of not running out of stock during a replenishment cycle, the target you set when sizing safety stock.",
    explain: [
      [
        "A 95% cycle service level means that in about 95 of 100 replenishment cycles the shelf never empties before the next delivery. It is a planning target, and it is not the same as ",
        g("fill-rate", "fill rate"),
        ", which measures the share of demand actually shipped.",
      ],
      [
        "In the statistical safety stock formula, the target service level becomes a z-score: about 1.28 for 90%, 1.65 for 95% and 2.33 for 99% under a normal distribution.",
      ],
    ],
    formula: ["Safety Stock = z × σ(demand during lead time)", "z = the normal-distribution score for the target service level"],
    sections: [
      {
        title: "How much stock each service level costs",
        paragraphs: [
          [
            "Each extra point of service costs more stock than the last. Going from 90% to 95% adds about 0.37 standard deviations of buffer; going from 95% to 99% adds about 0.68. Because the cost curve steepens, one service level for every SKU wastes money.",
          ],
        ],
        table: {
          head: ["Cycle service level", "z-score", "Safety stock for σ = 40 units"],
          rows: [
            ["90%", "1.28", "about 51 units"],
            ["95%", "1.65", "about 66 units"],
            ["99%", "2.33", "about 93 units"],
          ],
        },
      },
      {
        title: "Set targets by item, not by company",
        paragraphs: [
          [
            "Distributors usually set higher targets for A-class and critical items and lower ones for C-class items, where a rare stockout costs little. A useful way to choose is to compare the cost of a stockout (lost margin, expediting, damage to the account) with the cost of carrying the extra buffer. Where running out is cheap, accept a lower target; where it puts a customer relationship at risk, pay for the higher one.",
          ],
          [
            "Be careful with promises. A 99% target on everything needs a lot of inventory, and a customer who hears '99%' usually means 99% of their orders arrive complete, which is a fill rate promise, not a cycle service level one.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: if demand during the lead time has a standard deviation of 40 units, safety stock is about 51 units for 90% (1.28 × 40), 66 units for 95% and 93 units for 99%. Moving from 95% to 99% costs 27 more units of buffer on this one SKU, multiplied across thousands of SKUs.",
      ],
    ],
    why: [
      [
        "Service level is the lever that connects stock investment to customer experience. Setting it deliberately, by ABC class, turns 'how much safety stock?' from a guess into a decision about where reliability is worth paying for.",
      ],
    ],
    mistakes: [
      ["Promising 99%+ service on everything without pricing the inventory it requires."],
      ["Mixing up cycle service level with fill rate when reporting to customers."],
      ["Using the same service level for A items and rarely ordered C items."],
    ],
    inApp: [
      "Supply Chain Manager sizes safety stock with a fixed 95% service level (z = 1.65) when a SKU's daily demand varies. The target is not adjustable per SKU or per ABC class yet.",
    ],
    faq: [
      {
        q: "What is a good service level?",
        a: ["There is no universal number. Many distributors start around 95% and go higher for critical A items; compare the cost of a stockout with the cost of the extra stock."],
      },
      {
        q: "How do I choose a service level for a new SKU?",
        a: ["Start from its ABC class: higher for A items and customer-critical lines, lower for C items. Then compare the cost of a stockout with the cost of the extra stock, and adjust after you see real results."],
      },
      {
        q: "Is service level the same as fill rate?",
        a: ["No. Service level is the chance of not stocking out in a cycle; fill rate is the share of demand actually shipped from stock."],
      },
    ],
    related: ["fill-rate", "stockout", "abc-analysis", "lead-time", "forecast-accuracy"],
    guides: ["safety-stock-formula"],
    updated: U,
  },
  {
    slug: "fill-rate",
    term: "Fill Rate",
    short: "Fill rate",
    metaTitle: "Fill Rate and Perfect Order Rate: Formula & Example",
    category: "inventory",
    definition:
      "Fill rate is the share of customer demand shipped from stock on the first attempt, by units, lines or orders. Perfect order rate is the stricter all-in measure.",
    explain: [
      [
        "Fill rate is the customer's view of availability. Unit fill rate counts units shipped against units ordered; line fill rate counts order lines shipped complete; order fill rate counts whole orders shipped complete, which is the strictest of the three.",
      ],
      [
        "Fill rate and ",
        g("service-level", "service level"),
        " are often confused. Cycle service level is a planning target about how often you run out during a replenishment cycle; fill rate measures how much demand you actually met. A business can hit a 95% cycle service level and still have a lower or higher fill rate, depending on how large the shortfalls are when they happen.",
      ],
    ],
    formula: ["Unit Fill Rate = Units shipped from stock on first attempt ÷ Units ordered × 100"],
    sections: [
      {
        title: "Perfect order rate: the whole order, right first time",
        paragraphs: [
          [
            "Perfect order rate is the share of customer orders delivered complete, on time, undamaged and with correct paperwork, all at once. It multiplies several failure points together, so it is always lower than any single measure. An order that arrives on time but one line short, or complete but with a wrong invoice, is not perfect.",
          ],
          [
            "Which components to include depends on what your customers care about. Some add invoice accuracy or correct pricing; others add delivery within a time window. The value is in choosing a definition that matches the customer's view of a good order and tracking it consistently. Reporting each component separately and never the combined figure is the usual mistake, because the combined figure is closest to how a customer remembers you.",
          ],
        ],
        formula: ["Perfect Order Rate ≈ % on time × % complete × % undamaged × % correct documentation"],
      },
      {
        title: "Which measure to report",
        table: {
          head: ["Measure", "Counts", "Strictness"],
          rows: [
            ["Unit fill rate", "Units shipped ÷ units ordered", "Most forgiving"],
            ["Line fill rate", "Order lines shipped complete", "Stricter"],
            ["Order fill rate", "Whole orders shipped complete", "Strict"],
            ["Perfect order rate", "Complete, on time, undamaged, correct paperwork", "Strictest"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: customers ordered 10,000 units across 1,000 lines in a month. 9,600 units shipped first time (96% unit fill rate), but 80 lines were short, so line fill rate is 92%. If those short lines were spread across 150 orders, order fill rate could be much lower again. For perfect order rate: 95% on time, 96% complete, 99% undamaged and 98% correct paperwork gives 0.95 × 0.96 × 0.99 × 0.98 ≈ 88%, so roughly one order in eight has some problem.",
      ],
    ],
    why: [
      [
        "Wholesale customers judge a distributor by whether orders arrive complete. Tracking fill rate by customer and SKU shows which stockouts actually hurt relationships, and breaking perfect order rate into its components shows which part of the process to fix first.",
      ],
    ],
    mistakes: [
      ["Reporting unit fill rate when customers care about complete orders."],
      ["Counting a short line as filled once a backorder ships later."],
      ["Reporting each perfect-order component separately and never the combined figure."],
    ],
    inApp: [
      "Supply Chain Manager does not measure customer fill rate or perfect order rate. It measures supplier on-time-in-full (OTIF) on purchase orders, which is the supply-side equivalent.",
    ],
    faq: [
      {
        q: "What is a good fill rate?",
        a: ["It depends on your customers and products. Instead of copying an industry figure, measure yours by customer and by SKU and look for the lines where shortages cost you most."],
      },
      {
        q: "How is fill rate different from OTIF?",
        a: ["Fill rate usually measures your shipments to customers. OTIF is commonly applied to deliveries, including suppliers' deliveries to you, and requires both on time and in full."],
      },
    ],
    related: ["service-level", "stockout", "days-of-supply", "on-time-delivery-rate", "abc-analysis"],
    updated: U,
  },
  {
    slug: "stockout",
    term: "Stockout",
    short: "Stockout",
    metaTitle: "Stockout, Backorder and Lost Sales: Cost & Examples",
    category: "inventory",
    definition:
      "A stockout is when a SKU has no available inventory to fill demand, so orders are backordered, lost or substituted. Backorders and lost sales are the outcomes.",
    explain: [
      [
        "The visible cost is the missed sale. The hidden costs include expediting fees, split shipments, staff time spent apologizing and customers who quietly move part of their spend to another distributor.",
      ],
      [
        "A stockout at one warehouse while another holds plenty is still a stockout for the customer it was meant to serve. That is why stock-out risk is best tracked per warehouse.",
      ],
    ],
    sections: [
      {
        title: "Backorder: the sale you keep, at a price",
        paragraphs: [
          [
            "A backorder is customer demand accepted while the item is out of stock and promised for later shipment once stock arrives. Backorders keep the sale, but they still cost money: a second pick and shipment, customer service time and a less happy customer. They also reduce your inventory position, because incoming stock is already spoken for.",
          ],
          [
            "In wholesale, many customers would rather have the rest of their order now and the missing line later, which makes backorders common and easy to normalize. Recording the reason for each one helps separate supplier delays from planning gaps, and tracking backorder volume and age by SKU shows which items are chronically under-stocked.",
          ],
        ],
        formula: ["Inventory Position = On Hand + On Order − Backorders"],
      },
      {
        title: "Lost sales: the demand you never see",
        paragraphs: [
          [
            "Lost sales are demand that walks away because an item was unavailable: the customer bought elsewhere instead of waiting. They are hard to measure because they leave no order behind. Common proxies are quotes that were not converted, cancelled lines and enquiries logged by the sales team while a SKU was out of stock.",
          ],
          [
            "They also distort history. If you only record shipments, a SKU that was out for two weeks looks as if demand fell, and the next forecast orders even less, which repeats the stockout.",
          ],
        ],
      },
      {
        title: "What a stockout costs",
        paragraphs: [
          [
            "Some parts of stockout cost are easy to measure, like expedite freight and lost margin. Others are not, like customers who quietly move future orders elsewhere. Even a rough estimate helps when deciding how much safety stock a SKU deserves. Costs differ by customer and product: a missing consumable for a walk-in customer may cost one sale, while a missing line on a large contractor's project order can put the whole account at risk. Compare stockout cost with carrying cost to set service levels: high where running out is expensive, lower where it is not.",
          ],
        ],
        formula: ["Stockout Cost ≈ Lost margin + Backorder handling + Expediting + Penalties + Estimated lost future sales"],
      },
    ],
    example: [
      [
        "Illustrative numbers: a SKU sells 30 units a day at $12 margin each and is out for 5 days. If half of those customers wait and half buy elsewhere, the direct lost margin is 75 units × $12 = $900. Add backorder handling at $5 each (75 × $5 = $375) and one $300 expedite, and the visible cost is $1,575 before any lost goodwill. For lost sales: a SKU normally ships 20 a day; during an 8-day stockout 60 units were backordered, so a rough estimate of lost sales is 8 × 20 − 60 = 100 units.",
      ],
    ],
    why: [
      [
        "Most stockouts are visible days in advance: days of supply falls below supplier lead time. Catching that early leaves time to reorder, expedite or transfer instead of explaining a missed delivery.",
      ],
    ],
    mistakes: [
      ["Only noticing a stockout when a customer order fails."],
      ["Recording demand during a stockout as zero, which makes future forecasts too low."],
      ["Leaving backorders out of inventory position."],
      ["Ignoring lost sales because they do not appear in the ERP."],
      ["Treating stockout cost as zero because it never appears on an invoice, or using one cost for every SKU and customer."],
    ],
    inApp: [
      "Supply Chain Manager flags stock-out risk when stock is zero or will last 3 days or fewer at the recent sales pace, per SKU and warehouse. It does not record backorders or lost sales.",
    ],
    faq: [
      {
        q: "What is the difference between a stockout and a backorder?",
        a: ["A stockout is the condition of having no stock. A backorder is one outcome: the customer accepts a later delivery. Others are a lost sale or a substitution."],
      },
      {
        q: "How do I estimate lost sales?",
        a: ["Use normal demand times the days out of stock, minus backorders taken. Treat it as a rough estimate, since some customers would not have bought anyway."],
      },
    ],
    related: ["days-of-supply", "fill-rate", "service-level", "forecast-bias", "lead-time"],
    guides: ["reorder-expedite-or-transfer"],
    updated: U,
  },
  {
    slug: "cycle-stock",
    term: "Cycle Stock",
    short: "Cycle stock",
    metaTitle: "Cycle, Pipeline and Anticipation Stock: Types of Inventory",
    category: "inventory",
    definition:
      "Cycle stock is the inventory you expect to sell between deliveries. Pipeline, anticipation and multi-echelon stock are the other layers of total inventory.",
    explain: [
      [
        "Total inventory is usually cycle stock plus safety stock, plus any stock in transit, seasonal build or buffer held at several levels of the network. Knowing which layer an excess belongs to tells you which lever to pull.",
      ],
      [
        "With steady demand, average cycle stock is about half the order quantity: it starts at the full order and falls towards zero. It is driven by order size, so it is the layer that order frequency, MOQs and supplier minimums control directly. Safety stock is driven by uncertainty.",
      ],
    ],
    formula: ["Average Cycle Stock ≈ Order Quantity ÷ 2"],
    sections: [
      {
        title: "Pipeline inventory (in-transit stock)",
        paragraphs: [
          [
            "Pipeline inventory is stock you own or have ordered that is still moving: shipped by the supplier, in transit between warehouses or awaiting receipt. It is not on the shelf, but it is not missing either. Leaving it out of planning leads to duplicate orders; counting it as available leads to promising goods to customers before they arrive.",
          ],
          [
            "It grows with lead time and volume. Moving from a 30-day sea route to a 10-day route cuts pipeline inventory in direct proportion, which is why total cost comparisons between suppliers should include it.",
          ],
        ],
        formula: ["Average Pipeline Inventory = Average Daily Demand × Transit Time (days)"],
      },
      {
        title: "Anticipation inventory (seasonal and forward buys)",
        paragraphs: [
          [
            "Anticipation inventory is stock built ahead of a known future event: a seasonal peak, an announced price rise or a supplier's factory shutdown. The decision is deliberate and temporary, and the stock should run down after the event. Without a plan to unwind it, a forward buy quietly turns into overstock, so tag it and watch its sell-down.",
          ],
        ],
      },
      {
        title: "Multi-echelon inventory (stock at several levels)",
        paragraphs: [
          [
            "Multi-echelon inventory is stock held at several linked levels of a network, such as a central warehouse feeding regional branches. Planning each location separately tends to stack safety stock at every level. Planning the network as a whole lets you hold more buffer centrally and less at each branch for the same service, because pooled demand is smoother than each branch's own.",
          ],
        ],
      },
      {
        title: "Layers of inventory at a glance",
        table: {
          head: ["Layer", "What drives it", "Lever"],
          rows: [
            ["Cycle stock", "Order size", "Order frequency, MOQs"],
            ["Safety stock", "Demand and lead time uncertainty", "Service level, supplier reliability"],
            ["Pipeline stock", "Lead time times demand", "Shorter routes, nearer suppliers"],
            ["Anticipation stock", "A known future event", "Plan a sell-down date"],
            ["Network buffer", "Where safety stock sits", "Hold more centrally, less at branches"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: ordering 600 units a month of a steady seller gives average cycle stock of about 300 units. Ordering 150 units weekly instead brings it down to about 75, at the price of four times as many orders. For pipeline stock, 40 units a day on a 30-day ocean transit means about 1,200 units are on the water at any time. For anticipation stock: a supplier announces an 8% price rise in 60 days; buying an extra 30 days of demand saves 8% on it while holding it a month costs about 2% at a 25% annual carrying rate, a net gain of roughly 6% if demand holds.",
      ],
    ],
    why: [
      [
        "Cutting safety stock to reduce inventory when the real excess is oversized orders achieves little. Splitting inventory into layers shows whether the cash is tied up in order size, uncertainty, shipping time or deliberate buying ahead.",
      ],
    ],
    mistakes: [
      ["Cutting safety stock to reduce inventory when the real excess is oversized orders."],
      ["Forgetting that more frequent, smaller orders raise ordering and freight costs."],
      ["Leaving open purchase orders out of the reorder calculation, or treating stock in transit between warehouses as available at the destination."],
      ["Building peak stock from last year's numbers without checking this year's trend, or leaving it in the safety stock calculation after the event."],
      ["Letting each branch set its own safety stock independently."],
    ],
    inApp: [
      "Supply Chain Manager credits open purchase orders as incoming stock in its stockout projections, but excludes any order whose expected date has passed without receipt, because there is no evidence those units are really on the way. It does not model anticipation stock or multi-echelon planning.",
    ],
    faq: [
      {
        q: "What is the difference between cycle stock and safety stock?",
        a: ["Cycle stock covers expected demand between deliveries. Safety stock is the extra buffer for demand that runs higher or deliveries that run late."],
      },
      {
        q: "Does pipeline inventory count in my inventory value?",
        a: ["Usually once you own the goods, depending on shipping terms and your accounting policy. Check with your accountant."],
      },
    ],
    related: ["economic-order-quantity", "service-level", "lead-time", "inventory-transfer", "seasonality"],
    guides: ["safety-stock-formula", "overstock-vs-dead-stock"],
    updated: U,
  },
  {
    slug: "abc-analysis",
    term: "ABC Analysis",
    short: "ABC analysis",
    metaTitle: "ABC and XYZ Analysis: Inventory Classification",
    category: "inventory",
    definition:
      "ABC analysis ranks SKUs by annual consumption value. XYZ analysis ranks them by demand variability. Together they decide where planning effort goes.",
    explain: [
      [
        "ABC applies the Pareto idea to inventory. Sort SKUs by annual consumption value (annual units × unit cost), add up their cumulative share, and band them. A typical split is A for the SKUs that make up the first 80% of value, B for the next 15% and C for the last 5%. Cut-offs vary by business.",
      ],
      [
        "ABC says how much an item matters, not how predictable it is. That is the job of XYZ analysis, and pairing the two gives a 3 × 3 grid that suggests a different policy for each cell.",
      ],
    ],
    formula: [
      "Annual Consumption Value = Annual Units × Unit Cost",
      "Sort descending; cumulative share ≤ 80% → A, ≤ 95% → B, rest → C",
    ],
    sections: [
      {
        title: "XYZ analysis: how predictable is the demand?",
        paragraphs: [
          [
            "XYZ classifies SKUs by the coefficient of variation (CV) of demand, the standard deviation divided by the mean: X for CV up to 0.5, Y for 0.5 to 1.0 and Z above 1.0. Thresholds vary between businesses and depend on the time bucket used, so use the same bucket for every SKU. See ",
            g("intermittent-demand", "intermittent demand"),
            " for how CV and zero-demand periods interact.",
          ],
        ],
        formula: ["CV = Standard Deviation of Demand ÷ Mean Demand", "X: CV ≤ 0.5   Y: 0.5 < CV ≤ 1.0   Z: CV > 1.0"],
      },
      {
        title: "The 3 × 3 grid: a policy for each cell",
        table: {
          head: ["", "X (steady)", "Y (variable)", "Z (erratic)"],
          rows: [
            ["A (high value)", "Automate; tight service level", "Automate with review; higher buffer", "Planner stays involved; consider order-to-demand"],
            ["B (medium)", "Automate", "Automate with exception alerts", "Review monthly; modest buffer"],
            ["C (low value)", "Simple periodic rules", "Simple rules; larger lots", "Minimal stock or special order"],
          ],
        },
      },
      {
        title: "SKU rationalization: pruning the range",
        paragraphs: [
          [
            "SKU rationalization is the review of your product range to cut or consolidate SKUs whose sales, margin or strategic value no longer justify stocking them. Ranges grow by addition: a new supplier, a customer request, a new pack size. Few items ever get removed. Candidates are usually low-volume, low-margin C items with long days of supply, near-duplicates of other items, and lines a single customer bought once.",
          ],
          [
            "Fewer SKUs means less safety stock overall, simpler forecasting, faster picking and easier cycle counts. Before cutting, check whether an important customer depends on the item to complete their orders, and judge SKUs on margin after carrying cost, not on revenue alone.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: in a range of 2,000 SKUs, a few hundred might account for 80% of consumption value. Those A items deserve tight review and higher service levels; many C items can run on simple periodic rules. A cleaning product selling 50, 55, 48 and 52 a week has a CV well under 0.5 (X) and suits automatic replenishment, while a spare part selling 0, 0, 30 and 2 a week has a CV above 1 (Z) and needs an intermittent-demand method or a minimum-stock policy. For rationalization: 400 SKUs that make up under 2% of sales but hold 15% of inventory value are good candidates to review.",
      ],
    ],
    why: [
      [
        "No planner can give 2,000 SKUs equal attention. ABC focuses reviews, cycle counts and supplier negotiations where the money is, and XYZ explains why one forecasting method rarely fits a whole range and where automation is safe.",
      ],
    ],
    mistakes: [
      ["Ranking by unit price or units sold alone instead of consumption value."],
      ["Never re-running the classification as the range and demand change."],
      ["Treating every C item as unimportant, even when it is critical to a key customer's order."],
      ["Calculating CV on daily data for slow items, which makes almost everything look erratic."],
      ["Cutting a low-volume SKU that an important customer depends on to complete their orders."],
    ],
    inApp: [
      "Supply Chain Manager's Forecast Accuracy page groups SKUs into A, B and C bands (top 80%, next 15%, last 5% of annual consumption value) and combines them with X, Y and Z demand classes (CV up to 0.5, up to 1.0, above 1.0). The classes appear in its accuracy reporting; the app does not apply different service levels by class.",
    ],
    faq: [
      {
        q: "How often should I re-run ABC analysis?",
        a: ["At least twice a year, and after major range or pricing changes. Classes drift as demand and costs change."],
      },
      {
        q: "Is ABC based on revenue or cost?",
        a: ["Most distributors use annual consumption value at cost (units times unit cost). Revenue or margin are valid alternatives if you use them consistently."],
      },
    ],
    related: ["service-level", "intermittent-demand", "cycle-counting", "gmroi", "forecast-accuracy"],
    guides: ["overstock-vs-dead-stock"],
    updated: U,
  },
];
