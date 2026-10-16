import { g, guide, type GlossaryTerm } from "./types";

const U = "2026-10-16";

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
    example: [
      [
        "Illustrative numbers: a warehouse shipped 630 units of a SKU over the last 90 days. Average daily demand = 630 ÷ 90 = 7 units per day. If you instead divided by only the 60 days the item was in stock, you would get 10.5 units per day, which is the better estimate of true demand when stockouts suppressed sales.",
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
    ],
    inApp: [
      "Supply Chain Manager calculates it per SKU per warehouse from the trailing 90 days of sales plus transfers out, divided by 90. With no movement in that window it shows no demand, never a made-up figure.",
    ],
    related: ["days-of-supply", "lead-time-demand", "coefficient-of-variation", "demand-spike"],
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
        "It turns a raw unit count into time, which is what purchasing actually reasons about. 400 units means nothing on its own; 400 units that last 6 days against a 14-day supplier lead time is an emergency.",
      ],
      [
        "Retailers often express the same idea in weeks (weeks of supply). The calculation is identical; only the unit changes.",
      ],
    ],
    formula: ["Days of Supply = Available Inventory ÷ Average Daily Demand"],
    example: [
      [
        "Illustrative numbers: 84 units available, selling 21 a day. Days of supply = 84 ÷ 21 = 4 days. If the supplier needs 8 days to deliver, an order placed today still leaves roughly 4 days with nothing on the shelf, unless you expedite or transfer stock from another warehouse.",
      ],
    ],
    why: [
      [
        "Comparing days of supply with ", g("lead-time", "supplier lead time"), " is the quickest way to triage a long SKU list. Anything with fewer days of supply than lead time is already late; anything with several hundred days ties up cash.",
      ],
    ],
    mistakes: [
      ["Dividing by zero demand and reporting infinite days. A SKU with no demand needs a different review, not an infinite number."],
      ["Using on-hand instead of available stock, so units already promised to customers are counted twice."],
      ["Looking at one company-wide number when stock sits in the wrong warehouse."],
    ],
    inApp: [
      "Supply Chain Manager shows days of stock for every SKU and warehouse, flags 3 days or fewer as stock-out risk, and more than 180 days as slow-moving.",
    ],
    related: ["average-daily-demand", "available-inventory", "lead-time", "slow-moving-inventory"],
    guides: ["reorder-expedite-or-transfer", "overstock-vs-dead-stock"],
    updated: U,
  },
  {
    slug: "lead-time",
    term: "Lead Time",
    short: "Lead time",
    category: "inventory",
    definition:
      "Lead time is the time between deciding to replenish a SKU and having the goods available to sell, usually counted in days from purchase order to receipt.",
    explain: [
      [
        "For a distributor the main component is supplier lead time: how long the supplier takes to ship plus transit. Internal steps add to it: time to approve and send the purchase order, and time to receive, check and put the goods away.",
      ],
      [
        "Quoted lead time and actual lead time are often different. Planning on the quoted number when the supplier routinely runs late is one of the most common causes of stockouts.",
      ],
    ],
    formula: ["Lead Time = Date goods are available to sell − Date the replenishment decision was made"],
    example: [
      [
        "Illustrative numbers: a supplier quotes 10 days. Your last five receipts took 9, 12, 14, 11 and 13 days from order date, an average of 11.8 days. Add one day to raise and approve the order and one day to receive and put away, and the planning lead time is closer to 14 days than 10.",
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
      ["Ignoring ", g("lead-time-variability", "lead-time variability"), ": the average alone hides the late deliveries that cause stockouts."],
    ],
    inApp: [
      "Supply Chain Manager uses each supplier's lead time in its safety stock and reorder point, and tracks actual purchase-order cycle time so you can compare the quote with reality.",
    ],
    related: ["lead-time-demand", "lead-time-variability", "po-cycle-time", "safety-time"],
    guides: ["reorder-point-formula"],
    updated: U,
  },
  {
    slug: "lead-time-demand",
    term: "Lead Time Demand",
    short: "Lead time demand",
    category: "inventory",
    definition:
      "Lead time demand is the quantity you expect to sell while waiting for a replenishment order to arrive: average daily demand multiplied by lead time.",
    explain: [
      [
        "It is the first half of the reorder point. If stock on hand when you order is less than lead time demand, you will run out before the delivery lands, even if the supplier is perfectly on time.",
      ],
      [
        "Lead time demand is an average. In practice, demand during the lead time varies from cycle to cycle, and the lead time itself varies too. That is why the reorder point adds safety stock on top: lead time demand covers the expected case, and safety stock covers the cycles where demand runs higher or the supplier runs late.",
      ],
    ],
    formula: ["Lead Time Demand = Average Daily Demand × Lead Time (days)"],
    example: [
      [
        "Illustrative numbers: 21 units a day and an 8-day lead time give lead time demand of 168 units. Add a safety buffer and you get the ",
        guide("reorder-point-formula", "reorder point"),
        ".",
      ],
    ],
    why: [
      [
        "It makes the cost of long lead times visible. Doubling lead time doubles the stock you must hold just to bridge the wait, before any buffer for uncertainty.",
      ],
    ],
    mistakes: [
      ["Multiplying monthly demand by a lead time in days without converting the units."],
      ["Forgetting that demand during the lead time varies, which is what safety stock is for."],
    ],
    related: ["average-daily-demand", "lead-time", "inventory-position", "continuous-review-system"],
    guides: ["reorder-point-formula", "safety-stock-formula"],
    updated: U,
  },
  {
    slug: "economic-order-quantity",
    term: "Economic Order Quantity (EOQ)",
    short: "EOQ",
    category: "inventory",
    definition:
      "Economic order quantity (EOQ) is the order size that minimizes the combined yearly cost of placing orders and holding inventory for a SKU with steady demand.",
    explain: [
      [
        "Ordering often in small amounts keeps stock low but racks up ", g("ordering-cost", "ordering costs"), ". Ordering rarely in big amounts saves on orders but raises ", g("inventory-carrying-cost", "carrying costs"), ". EOQ is the textbook balance point between the two.",
      ],
      [
        "The model assumes steady demand, a fixed cost per order and a fixed holding cost per unit. Real distributors rarely meet all three, so treat EOQ as a sensible starting point, then adjust for ", g("minimum-order-quantity", "minimum order quantities"), ", ", g("quantity-break", "price breaks"), ", pallet sizes and shelf life.",
      ],
    ],
    formula: [
      "EOQ = √( 2 × D × S ÷ H )",
      "D = annual demand in units",
      "S = cost of placing one order",
      "H = cost of holding one unit for a year",
    ],
    example: [
      [
        "Illustrative numbers: annual demand of 5,000 units, $50 to place an order and $2.50 a year to hold one unit. EOQ = √(2 × 5,000 × 50 ÷ 2.5) = √200,000 ≈ 447 units, or roughly 11 orders a year.",
      ],
    ],
    why: [
      [
        "It gives a defensible default order size instead of 'whatever we ordered last time'. For high-volume, stable SKUs, moving towards EOQ can trim both order handling and cash tied up in stock.",
      ],
    ],
    mistakes: [
      ["Applying EOQ to lumpy or seasonal items where its steady-demand assumption fails."],
      ["Guessing the holding cost. It drives the answer, so estimate it from real storage, capital and obsolescence costs."],
      ["Ignoring supplier MOQs and case packs, which often override the calculated quantity."],
    ],
    related: ["ordering-cost", "inventory-carrying-cost", "minimum-order-quantity", "quantity-break", "cycle-stock"],
    updated: U,
  },
  {
    slug: "minimum-order-quantity",
    term: "Minimum Order Quantity (MOQ)",
    short: "MOQ",
    category: "inventory",
    definition:
      "Minimum order quantity (MOQ) is the smallest quantity a supplier will accept on a single order line, set in units, cases or order value.",
    explain: [
      [
        "Suppliers set MOQs to cover their own setup, picking and shipping costs. For the buyer, an MOQ larger than what you need forces a choice: order more than needed, combine the item with other orders, or find another source.",
      ],
    ],
    formula: ["Order Quantity = max(Calculated Need, MOQ), rounded up to the case or pack size"],
    example: [
      [
        "Illustrative numbers: you need 120 units of a slow seller to cover the next two months, but the supplier's MOQ is 500. Ordering 500 means about eight months of stock. At a carrying cost of 25% of value a year, that extra stock has a real cost you can compare against paying a small-order surcharge or switching supplier.",
      ],
    ],
    why: [
      [
        "MOQs are a common hidden source of ", g("slow-moving-inventory", "slow-moving stock"), ". Knowing which SKUs are MOQ-bound helps you negotiate lower minimums, consolidate orders or move the item to a distributor or wholesaler that sells smaller quantities.",
      ],
    ],
    mistakes: [
      ["Letting the MOQ silently become the reorder quantity for every order."],
      ["Never renegotiating MOQs as your volumes change."],
      ["Confusing a value-based minimum (for example a minimum spend per order) with a per-SKU MOQ."],
    ],
    related: ["economic-order-quantity", "quantity-break", "slow-moving-inventory", "inventory-carrying-cost"],
    updated: U,
  },
  {
    slug: "min-max-inventory",
    term: "Min/Max Inventory",
    short: "Min/max",
    category: "inventory",
    definition:
      "Min/max inventory is a replenishment rule: when stock falls to the minimum level, order enough to bring it back up to the maximum level.",
    explain: [
      [
        "The minimum works like a reorder point and the maximum caps how much you hold. It is simple, easy to explain to a warehouse team and supported by almost every ERP and inventory system.",
      ],
      [
        "Its weakness is that the levels are often set once and forgotten. When demand or lead time changes, a static min and max quietly drift into stockouts or overstock.",
      ],
    ],
    formula: ["When Inventory Position ≤ Min:  Order Quantity = Max − Inventory Position"],
    example: [
      [
        "Illustrative numbers: min 200, max 600. Stock on hand plus on order drops to 180, so the order is 600 − 180 = 420 units. If demand has doubled since the levels were set, that 200-unit minimum may now cover only half the lead time.",
      ],
    ],
    why: [
      [
        "Min/max is often the starting point for distributors moving off pure gut feel. Setting the min from ",
        g("lead-time-demand", "lead time demand"),
        " plus safety stock, and recalculating both levels regularly from real demand, keeps the rule honest.",
      ],
    ],
    mistakes: [
      ["Setting levels once and never recalculating them."],
      ["Using on-hand stock instead of inventory position, which triggers duplicate orders while a PO is already in transit."],
      ["Using the same min and max across warehouses with very different demand."],
    ],
    related: ["inventory-position", "continuous-review-system", "periodic-review-system", "economic-order-quantity"],
    guides: ["reorder-point-formula"],
    updated: U,
  },
  {
    slug: "periodic-review-system",
    term: "Periodic Review System",
    short: "Periodic review",
    category: "inventory",
    definition:
      "A periodic review system checks stock at fixed intervals, such as every Monday, and orders enough to bring each SKU up to a target level.",
    explain: [
      [
        "It is also called a fixed-interval or order-up-to system. Because orders go out on a schedule, it suits suppliers with weekly delivery runs and makes it easy to group many SKUs from the same supplier onto one purchase order.",
      ],
      [
        "The trade-off is that a SKU can fall dangerously low between reviews, so the target level has to cover demand for the review period plus the lead time.",
      ],
    ],
    formula: [
      "Order-up-to Level = Average Daily Demand × (Review Period + Lead Time) + Safety Stock",
      "Order Quantity = Order-up-to Level − Inventory Position",
    ],
    example: [
      [
        "Illustrative numbers: 20 units a day, weekly review (7 days), 5-day lead time, 60 units of safety stock. Order-up-to level = 20 × 12 + 60 = 300. If inventory position on review day is 110, order 190.",
      ],
    ],
    why: [
      [
        "Most distributors order from each supplier on a rhythm anyway. Formalizing it as a periodic review makes order sizes consistent and helps hit freight minimums and ", g("quantity-break", "quantity breaks"), ".",
      ],
    ],
    mistakes: [
      ["Covering only the lead time and forgetting the review period."],
      ["Skipping a review cycle without adjusting the next order."],
    ],
    related: ["continuous-review-system", "min-max-inventory", "inventory-position", "lead-time-demand"],
    updated: U,
  },
  {
    slug: "continuous-review-system",
    term: "Continuous Review System",
    short: "Continuous review",
    category: "inventory",
    definition:
      "A continuous review system watches each SKU's stock all the time and places a fixed-size order the moment it falls to the reorder point.",
    explain: [
      [
        "It is also called a fixed-order-quantity or (s, Q) system. The order size stays the same and the timing varies. Because it reacts as soon as stock crosses the trigger, it needs less safety stock than a periodic system for the same service level.",
      ],
      [
        "It used to require constant manual checking, which is why it was reserved for the most important items. With live inventory data, software can watch every SKU continuously.",
      ],
    ],
    formula: ["When Inventory Position ≤ Reorder Point: order a fixed quantity Q (often the EOQ)"],
    example: [
      [
        "Illustrative numbers: reorder point 252 units, order quantity 450. On Wednesday a large shipment drops inventory position from 300 to 240, so a 450-unit order goes out the same day instead of waiting for Monday's review.",
      ],
    ],
    why: [
      [
        "For fast movers and A-class items, reacting the day stock crosses the line rather than at the next weekly review is often the difference between a near miss and a stockout.",
      ],
    ],
    mistakes: [
      ["Triggering on on-hand stock and reordering again while a PO is already open."],
      ["Using a fixed quantity that no longer matches current demand."],
    ],
    related: ["periodic-review-system", "inventory-position", "economic-order-quantity", "min-max-inventory"],
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
        "A 95% cycle service level means that in about 95 of 100 replenishment cycles the shelf never empties before the next delivery. It is a planning target, and it is not the same as ", g("fill-rate", "fill rate"), ", which measures the share of demand actually shipped.",
      ],
      [
        "In the statistical safety stock formula, the target service level becomes a z-score: about 1.28 for 90%, 1.65 for 95% and 2.33 for 99% under a normal distribution.",
      ],
    ],
    formula: ["Safety Stock = z × σ(demand during lead time)", "z = the normal-distribution score for the target service level"],
    example: [
      [
        "Illustrative numbers: if demand during the lead time has a standard deviation of 40 units, safety stock is about 51 units for 90% (1.28 × 40), 66 units for 95% and 93 units for 99%. Each extra point of service costs more stock than the last.",
      ],
    ],
    why: [
      [
        "Setting one service level for every SKU wastes money. Distributors usually set higher targets for A-class and critical items and lower ones for C-class items, where a rare stockout costs little.",
      ],
    ],
    mistakes: [
      ["Promising 99%+ service on everything without pricing the inventory it requires."],
      ["Mixing up cycle service level with fill rate when reporting to customers."],
    ],
    related: ["fill-rate", "stockout", "abc-analysis", "coefficient-of-variation"],
    guides: ["safety-stock-formula"],
    updated: U,
  },
  {
    slug: "fill-rate",
    term: "Fill Rate",
    short: "Fill rate",
    category: "inventory",
    definition:
      "Fill rate is the share of customer demand shipped from stock on the first attempt, measured by units, order lines or whole orders.",
    explain: [
      [
        "It is the customer's view of availability. Unit fill rate counts units shipped against units ordered; line fill rate counts order lines shipped complete; order fill rate counts whole orders shipped complete, which is the strictest of the three.",
      ],
      [
        "Fill rate and service level are often confused. Cycle service level is a planning target about how often you run out during a replenishment cycle; fill rate measures how much demand you actually met. A business can hit a 95% cycle service level and still have a lower or higher fill rate, depending on how large the shortfalls are when they happen.",
      ],
    ],
    formula: ["Unit Fill Rate = Units shipped from stock on first attempt ÷ Units ordered × 100"],
    example: [
      [
        "Illustrative numbers: customers ordered 10,000 units across 1,000 lines in a month. 9,600 units shipped first time (96% unit fill rate), but 80 lines were short, so line fill rate is 92%. If those short lines were spread across 150 orders, order fill rate could be much lower again.",
      ],
    ],
    why: [
      [
        "Wholesale customers judge a distributor by whether orders arrive complete. Tracking fill rate by customer and SKU shows which stockouts actually hurt relationships.",
      ],
    ],
    mistakes: [
      ["Reporting unit fill rate when customers care about complete orders."],
      ["Counting a short line as filled once a backorder ships later."],
    ],
    related: ["service-level", "backorder", "perfect-order-rate", "stockout"],
    updated: U,
  },
  {
    slug: "stockout",
    term: "Stockout",
    short: "Stockout",
    category: "inventory",
    definition:
      "A stockout happens when a SKU has no available inventory to fill demand, so orders are backordered, lost or substituted.",
    explain: [
      [
        "The visible cost is the missed sale. The hidden costs include expediting fees, split shipments, staff time spent apologizing and customers who quietly move part of their spend to another distributor.",
      ],
      [
        "A stockout at one warehouse while another holds plenty is still a stockout for the customer it was meant to serve. That is why stock-out risk is best tracked per warehouse.",
      ],
    ],
    example: [
      [
        "Illustrative numbers: a SKU sells 30 units a day at $12 margin each and is out for 5 days. If half of those customers wait and half buy elsewhere, the direct lost margin is 75 units × $12 = $900, before expediting or the risk of losing the account.",
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
    ],
    inApp: [
      "Supply Chain Manager flags stock-out risk when available stock is zero or will last 3 days or fewer at the recent sales pace, per SKU and warehouse.",
    ],
    related: ["stockout-cost", "backorder", "lost-sales", "days-of-supply", "fill-rate"],
    guides: ["reorder-expedite-or-transfer"],
    updated: U,
  },
  {
    slug: "backorder",
    term: "Backorder",
    short: "Backorder",
    category: "inventory",
    definition:
      "A backorder is customer demand accepted while the item is out of stock and promised for later shipment once stock arrives.",
    explain: [
      [
        "Backorders keep the sale, unlike lost sales, but they still cost money: a second pick and shipment, customer service time and a less happy customer. They also reduce your inventory position, because incoming stock is already spoken for.",
      ],
      [
        "In wholesale, many customers would rather have the rest of their order now and the missing line later than wait for everything. That makes backorders common and often accepted, but each one still means a second pick, a second delivery and a customer service touch. Recording the reason for each backorder helps separate supplier delays from planning gaps.",
      ],
    ],
    formula: ["Inventory Position = On Hand + On Order − Backorders"],
    example: [
      [
        "Illustrative numbers: 0 on hand, 500 on order, 180 units backordered. Inventory position is 320, not 500. Planning from the 500 on order would underestimate how soon you need the next PO.",
      ],
    ],
    why: [
      [
        "In wholesale, many customers accept backorders on routine lines, which makes them easy to normalize. Tracking backorder volume and age by SKU shows which items are chronically under-stocked.",
      ],
    ],
    mistakes: [
      ["Leaving backorders out of inventory position."],
      ["Letting old backorders sit unreviewed after the customer has sourced elsewhere."],
    ],
    related: ["inventory-position", "lost-sales", "stockout", "fill-rate"],
    updated: U,
  },
  {
    slug: "lost-sales",
    term: "Lost Sales",
    short: "Lost sales",
    category: "inventory",
    definition:
      "Lost sales are demand that walks away because an item was unavailable: the customer bought elsewhere instead of waiting for a backorder.",
    explain: [
      [
        "Lost sales are hard to measure because they leave no order behind. Common proxies are quotes that were not converted, cancelled lines and enquiries logged by the sales team while a SKU was out of stock.",
      ],
      [
        "They also distort history. If you only record shipments, a SKU that was out for two weeks looks as if demand fell, and the next forecast orders even less.",
      ],
    ],
    example: [
      [
        "Illustrative numbers: a SKU normally ships 20 a day. During an 8-day stockout, 60 units were backordered. A rough estimate of lost sales is 8 × 20 − 60 = 100 units, assuming demand stayed at its normal rate.",
      ],
    ],
    why: [
      [
        "Repeated lost sales teach customers to shop around. For a distributor, being the reliable source is often worth more than a slightly lower price.",
      ],
    ],
    mistakes: [
      ["Ignoring lost sales because they do not appear in the ERP."],
      ["Forecasting from shipments during stockout periods without adjusting for suppressed demand."],
    ],
    related: ["stockout", "stockout-cost", "backorder", "forecast-bias"],
    updated: U,
  },
  {
    slug: "cycle-stock",
    term: "Cycle Stock",
    short: "Cycle stock",
    category: "inventory",
    definition:
      "Cycle stock is the inventory you expect to sell between deliveries: the part of stock that rises with each receipt and runs down until the next one.",
    explain: [
      [
        "Total inventory is usually cycle stock plus safety stock, plus any seasonal build or stock in transit. With steady demand, average cycle stock is about half the order quantity: it starts at the full order and falls towards zero.",
      ],
    ],
    formula: ["Average Cycle Stock ≈ Order Quantity ÷ 2"],
    example: [
      [
        "Illustrative numbers: ordering 600 units a month of a steady seller gives average cycle stock of about 300 units. Ordering 150 units weekly instead brings it down to about 75, at the price of four times as many orders.",
      ],
    ],
    why: [
      [
        "Cycle stock is driven by order size, so it is the part of inventory that order frequency, MOQs and supplier minimums control directly. Safety stock is driven by uncertainty. Knowing which is which tells you which lever to pull.",
      ],
    ],
    mistakes: [
      ["Cutting safety stock to reduce inventory when the real excess is oversized orders."],
      ["Forgetting that more frequent, smaller orders raise ordering and freight costs."],
    ],
    related: ["economic-order-quantity", "pipeline-inventory", "anticipation-inventory", "ordering-cost"],
    guides: ["safety-stock-formula"],
    updated: U,
  },
  {
    slug: "pipeline-inventory",
    term: "Pipeline Inventory (In-Transit Stock)",
    short: "Pipeline inventory",
    category: "inventory",
    definition:
      "Pipeline inventory is stock you own or have ordered that is still moving: shipped by the supplier, in transit between warehouses or awaiting receipt.",
    explain: [
      [
        "It is not on the shelf, but it is not missing either. Leaving it out of planning leads to duplicate orders; counting it as available leads to promising goods to customers before they arrive.",
      ],
      [
        "Pipeline stock grows with lead time and volume. Moving from a 30-day sea route to a 10-day route, or from a distant supplier to a nearer one, cuts pipeline inventory in direct proportion, which is one reason total cost comparisons between suppliers should include it.",
      ],
    ],
    formula: ["Average Pipeline Inventory = Average Daily Demand × Transit Time (days)"],
    example: [
      [
        "Illustrative numbers: 40 units a day of an imported SKU on a 30-day ocean transit means about 1,200 units are on the water at any time. That stock is capital tied up before it ever reaches your warehouse.",
      ],
    ],
    why: [
      [
        "For importers and distributors with several locations, in-transit stock can be a large share of total inventory value. Seeing it clearly is the basis of sensible inventory position and transfer decisions.",
      ],
    ],
    mistakes: [
      ["Leaving open purchase orders out of the reorder calculation."],
      ["Treating stock in transit between warehouses as available at the destination."],
    ],
    related: ["inventory-position", "inventory-transfer", "advance-shipping-notice", "lead-time"],
    updated: U,
  },
  {
    slug: "anticipation-inventory",
    term: "Anticipation Inventory (Seasonal Stock)",
    short: "Anticipation inventory",
    category: "inventory",
    definition:
      "Anticipation inventory is stock built ahead of a known future demand peak, price increase or supply disruption, beyond normal cycle and safety stock.",
    explain: [
      [
        "Examples include building heating products before winter, buying ahead of an announced price rise, or stocking up before a supplier's factory shutdown. The decision is deliberate and temporary: the stock should run down after the event.",
      ],
    ],
    example: [
      [
        "Illustrative numbers: a supplier announces an 8% price increase in 60 days. Buying an extra 30 days of demand now saves 8% on that stock, while holding it for an extra month costs about 2% at a 25% annual carrying rate. That is roughly a 6% net gain, if demand holds.",
      ],
    ],
    why: [
      [
        "Without a plan to unwind it, a seasonal or forward buy can quietly turn into overstock. Tagging anticipation stock and watching its sell-down separates a smart forward buy from a mistake.",
      ],
    ],
    mistakes: [
      ["Building the peak stock from last year's numbers without checking this year's trend."],
      ["Leaving anticipation stock in the safety stock calculation after the event, so it never runs down."],
    ],
    related: ["seasonality", "cycle-stock", "inventory-carrying-cost", "open-to-buy"],
    guides: ["overstock-vs-dead-stock"],
    updated: U,
  },
  {
    slug: "slow-moving-inventory",
    term: "Slow-Moving Inventory",
    short: "Slow-moving inventory",
    category: "inventory",
    definition:
      "Slow-moving inventory is stock that still sells, but so slowly that what you hold will take months to clear at the current pace.",
    explain: [
      [
        "It sits between healthy stock and dead stock. The item has demand, so it is not obsolete, but the quantity on hand is far out of line with that demand, often because of a large order, an MOQ or a demand drop.",
      ],
      [
        "A common threshold is more than about six months of supply at the current sales rate, but the right line depends on shelf life, product value and how quickly the range changes.",
      ],
    ],
    formula: ["Slow-moving if Days of Supply > threshold (for example 180 days)"],
    example: [
      [
        "Illustrative numbers: 900 units on hand, selling 4 a day. Days of supply = 225 days, about seven and a half months. At $20 a unit, that is $18,000 of stock, most of which will not be needed for half a year.",
      ],
    ],
    why: [
      [
        "Slow movers tie up cash and warehouse space that faster SKUs could use. Catching them early leaves options: stop reordering, transfer to a location with demand, bundle or promote, or return to the supplier.",
      ],
    ],
    mistakes: [
      ["Waiting until the item stops selling entirely before acting."],
      ["Continuing automatic reorders because the SKU still shows some sales."],
    ],
    inApp: [
      "Supply Chain Manager marks a SKU and warehouse as slow-moving when current stock would last more than 180 days at the trailing 90-day sales pace.",
    ],
    related: ["obsolete-inventory", "days-of-supply", "inventory-turnover", "sku-rationalization"],
    guides: ["overstock-vs-dead-stock"],
    updated: U,
  },
  {
    slug: "obsolete-inventory",
    term: "Obsolete Inventory",
    short: "Obsolete inventory",
    category: "inventory",
    definition:
      "Obsolete inventory is stock with no realistic future demand, because the product was superseded, discontinued, expired or simply stopped selling.",
    explain: [
      [
        "Dead stock is usually the early warning: no movement for a set period, such as 90 days. Obsolete is the conclusion that it will not sell at normal prices, which normally leads to a write-down or ",
        g("inventory-write-off", "write-off"),
        ".",
      ],
    ],
    example: [
      [
        "Illustrative numbers: 300 units of a phone accessory for a discontinued model, cost $6 each, have not sold in a year. Selling them to a liquidator at $1 recovers $300 of the $1,800 book value; the remaining $1,500 is a loss whether you recognize it now or later.",
      ],
    ],
    why: [
      [
        "Obsolete stock is pure cost: it uses space, gets counted at every stocktake and sits on the balance sheet at a value it will never fetch. Clearing it early usually recovers more than waiting.",
      ],
    ],
    mistakes: [
      ["Keeping obsolete stock at full value on the books."],
      ["Not stopping replenishment of superseded SKUs when the replacement is introduced."],
    ],
    related: ["slow-moving-inventory", "inventory-write-off", "sku-rationalization", "inventory-carrying-cost"],
    guides: ["overstock-vs-dead-stock"],
    updated: U,
  },
  {
    slug: "abc-analysis",
    term: "ABC Analysis",
    short: "ABC analysis",
    category: "inventory",
    definition:
      "ABC analysis ranks SKUs by their share of annual consumption value so planning effort goes to the few items that drive most of the value.",
    explain: [
      [
        "It applies the Pareto idea to inventory. Sort SKUs by annual consumption value (annual units × unit cost), add up their cumulative share, and band them. A typical split is A for the SKUs that make up the first 80% of value, B for the next 15% and C for the last 5%. Cut-offs vary by business.",
      ],
      [
        "ABC says how much an item matters, not how predictable it is. Pairing it with ", g("xyz-analysis", "XYZ analysis"), " gives a 3 × 3 grid that suggests a different policy for each cell.",
      ],
    ],
    formula: [
      "Annual Consumption Value = Annual Units × Unit Cost",
      "Sort descending; cumulative share ≤ 80% → A, ≤ 95% → B, rest → C",
    ],
    example: [
      [
        "Illustrative numbers: in a range of 2,000 SKUs, a few hundred might account for 80% of consumption value. Those A items deserve tight review and higher service levels; many C items can run on simple periodic rules.",
      ],
    ],
    why: [
      [
        "No planner can give 2,000 SKUs equal attention. ABC focuses reviews, cycle counts and supplier negotiations where the money is.",
      ],
    ],
    mistakes: [
      ["Ranking by unit price or units sold alone instead of consumption value."],
      ["Never re-running the classification as the range and demand change."],
      ["Treating every C item as unimportant, even when it is critical to a key customer's order."],
    ],
    inApp: [
      "Supply Chain Manager's Forecast Accuracy page groups SKUs into A, B and C bands (top 80%, next 15%, last 5% of annual consumption value) and combines them with XYZ demand classes.",
    ],
    related: ["xyz-analysis", "service-level", "cycle-counting", "sku-rationalization"],
    updated: U,
  },
  {
    slug: "xyz-analysis",
    term: "XYZ Analysis",
    short: "XYZ analysis",
    category: "inventory",
    definition:
      "XYZ analysis classifies SKUs by how predictable their demand is, using the coefficient of variation: X is steady, Y is variable and Z is erratic.",
    explain: [
      [
        "Where ABC measures value, XYZ measures volatility. A common split uses the ", g("coefficient-of-variation", "coefficient of variation"), " (CV) of demand: X for CV up to 0.5, Y for 0.5 to 1.0 and Z above 1.0. Thresholds vary between businesses and depend on the time bucket used.",
      ],
    ],
    formula: ["CV = Standard Deviation of Demand ÷ Mean Demand", "X: CV ≤ 0.5   Y: 0.5 < CV ≤ 1.0   Z: CV > 1.0"],
    example: [
      [
        "Illustrative numbers: a cleaning product selling 50, 55, 48 and 52 a week has a CV well under 0.5 (X). A spare part selling 0, 0, 30 and 2 a week has a CV above 1 (Z). The first suits automatic replenishment; the second needs an ",
        g("intermittent-demand", "intermittent-demand"),
        " method or a minimum-stock policy.",
      ],
    ],
    why: [
      [
        "Combining XYZ with ABC tells you where automation is safe (AX, BX) and where a planner should stay involved (AZ). It also explains why one forecasting method rarely fits a whole range.",
      ],
    ],
    mistakes: [
      ["Calculating CV on daily data for slow items, which makes almost everything look erratic."],
      ["Treating Z items as forecastable with standard smoothing methods."],
    ],
    inApp: [
      "Supply Chain Manager uses the same X, Y and Z bands (CV ≤ 0.5, ≤ 1.0, above 1.0) on its Forecast Accuracy matrix, alongside ABC classes.",
    ],
    related: ["abc-analysis", "coefficient-of-variation", "intermittent-demand", "crostons-method"],
    updated: U,
  },
];
