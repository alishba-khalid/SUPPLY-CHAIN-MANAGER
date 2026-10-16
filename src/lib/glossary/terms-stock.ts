import { g, type GlossaryTerm } from "./types";

const U = "2026-10-16";

export const STOCK_TERMS: GlossaryTerm[] = [
  {
    slug: "sku",
    term: "SKU (Stock Keeping Unit)",
    short: "SKU",
    category: "inventory",
    definition:
      "A SKU (stock keeping unit) is your internal code for one distinct item you stock, unique down to size, color, pack size or any variant you track separately.",
    explain: [
      [
        "A SKU is yours; a manufacturer part number or a barcode (GTIN/UPC/EAN) belongs to the product. One product can have several SKUs, for example a single unit and a case of 12, and two suppliers' identical products can map to one SKU if you treat them as interchangeable.",
      ],
      [
        "Every inventory number, from on-hand stock to forecasts, is kept per SKU, usually per SKU per warehouse. Clean, consistent SKU codes are what make that data usable.",
      ],
    ],
    example: [
      [
        "Illustrative: a distributor might use HRD-5005-10 for a 10-pack of a hinge and HRD-5005-01 for a single hinge, both pointing to the same manufacturer part number but planned, priced and stocked separately.",
      ],
    ],
    why: [
      [
        "Duplicate or inconsistent SKUs split one item's demand across codes, so each looks slower than it is and both get under-ordered. Data imports, forecasting and reporting all depend on a clean SKU list.",
      ],
    ],
    mistakes: [
      ["Reusing an old SKU code for a different product."],
      ["Creating a new SKU per supplier for the same interchangeable item."],
      ["Encoding so much meaning into codes that they break when the range changes."],
    ],
    related: ["sku-rationalization", "unit-of-measure", "abc-analysis", "quantity-on-hand"],
    updated: U,
  },
  {
    slug: "sku-rationalization",
    term: "SKU Rationalization",
    short: "SKU rationalization",
    category: "inventory",
    definition:
      "SKU rationalization is the review of your product range to cut or consolidate SKUs whose sales, margin or strategic value no longer justify stocking them.",
    explain: [
      [
        "Ranges grow by addition: a new supplier, a customer request, a new pack size. Few items ever get removed. Rationalization asks, SKU by SKU, whether the item earns its place once carrying cost, handling and complexity are counted.",
      ],
      [
        "Candidates are usually low-volume, low-margin C items with long days of supply, near-duplicates of other items, and lines a single customer bought once.",
      ],
    ],
    example: [
      [
        "Illustrative: a distributor finds 400 SKUs that together make up under 2% of sales but hold 15% of inventory value. Moving some to special order, merging duplicates and clearing the rest frees cash and shelf space without losing meaningful revenue.",
      ],
    ],
    why: [
      [
        "Fewer SKUs means less safety stock overall, simpler forecasting, faster picking and easier cycle counts. It also concentrates purchasing volume, which can improve terms with suppliers.",
      ],
    ],
    mistakes: [
      ["Cutting a low-volume SKU that an important customer depends on to complete their orders."],
      ["Judging SKUs on revenue alone instead of margin after carrying cost."],
    ],
    related: ["abc-analysis", "slow-moving-inventory", "obsolete-inventory", "gmroi", "back-to-back-order"],
    guides: ["overstock-vs-dead-stock"],
    updated: U,
  },
  {
    slug: "safety-time",
    term: "Safety Time (Safety Lead Time)",
    short: "Safety time",
    category: "inventory",
    definition:
      "Safety time is a buffer expressed in days rather than units: you plan to receive stock a set number of days before it is actually needed.",
    explain: [
      [
        "Instead of holding a fixed quantity of safety stock, you add days of cover. The buffer then grows and shrinks with demand automatically: 4 days of safety time is 40 units for a SKU selling 10 a day and 400 for one selling 100.",
      ],
      [
        "It is a simpler alternative to the statistical safety stock formula and works well when you lack enough history to measure demand variability reliably.",
      ],
    ],
    formula: ["Safety Stock = Average Daily Demand × Safety Time (days)"],
    example: [
      [
        "Illustrative numbers: a supplier with an 8-day lead time and a policy of half the lead time as safety time gives 4 days. At 21 units a day, safety stock = 84 units.",
      ],
    ],
    why: [
      [
        "Days are easier for a purchasing team to reason about than units, and the rule scales across thousands of SKUs without per-item tuning.",
      ],
    ],
    mistakes: [
      ["Using the same number of safety days for steady and erratic SKUs."],
      ["Never revisiting the rule when a supplier's reliability changes."],
    ],
    inApp: [
      "Supply Chain Manager sets safety stock as average daily demand multiplied by half the supplier's lead time.",
    ],
    related: ["lead-time", "lead-time-variability", "service-level", "days-of-supply"],
    guides: ["safety-stock-formula"],
    updated: U,
  },
  {
    slug: "inventory-position",
    term: "Inventory Position",
    short: "Inventory position",
    category: "inventory",
    definition:
      "Inventory position is stock on hand plus stock on order, minus backorders and committed stock: the figure reorder decisions should be based on.",
    explain: [
      [
        "On-hand stock answers 'what is on the shelf?'. Inventory position answers 'what will I have once everything already in motion lands?'. Reorder triggers that use on-hand stock alone place a second order while the first is still on its way.",
      ],
      [
        "Inventory position is the right trigger for reorder decisions because it looks forward. On-hand stock alone ignores what is already coming; available stock alone ignores what has been ordered. Using inventory position is the simplest fix for the classic problem of a second purchase order going out while the first is still on the water.",
      ],
    ],
    formula: ["Inventory Position = On Hand + On Order − Backorders − Allocated (committed) stock"],
    example: [
      [
        "Illustrative numbers: 150 on hand, 400 on an open PO, 50 backordered and 30 allocated to an order being picked. Inventory position = 150 + 400 − 50 − 30 = 470. With a reorder point of 300, no new order is needed yet, even though on-hand stock alone is below it.",
      ],
    ],
    why: [
      [
        "It prevents duplicate orders, which are a common source of overstock when lead times are long or several people raise purchase orders.",
      ],
    ],
    mistakes: [
      ["Triggering reorders from on-hand stock alone."],
      ["Counting cancelled or stale purchase orders as on order."],
    ],
    related: ["quantity-on-hand", "available-inventory", "allocated-inventory", "pipeline-inventory", "backorder"],
    guides: ["reorder-point-formula"],
    updated: U,
  },
  {
    slug: "quantity-on-hand",
    term: "Quantity on Hand",
    short: "Quantity on hand",
    category: "inventory",
    definition:
      "Quantity on hand is the physical count of units of a SKU in a warehouse right now, whether or not they are already promised to customers.",
    explain: [
      [
        "It is the most basic inventory number and the one cycle counts check. It includes units that are reserved for open orders, held for quality checks or damaged, which is why it often differs from what you can actually sell.",
      ],
      [
        "Quantity on hand is usually tracked per warehouse and often per bin location. Adding up on-hand quantity across sites is useful for finance, but for planning, each warehouse's figure matters separately, because stock in one building cannot fill an order due today from another.",
      ],
    ],
    formula: ["Quantity on Hand = Opening stock + Receipts − Shipments ± Adjustments"],
    example: [
      [
        "Illustrative numbers: 1,000 units on hand, 200 allocated to open orders and 20 on quality hold. Only 780 are available to promise to a new customer.",
      ],
    ],
    why: [
      [
        "Accurate on-hand figures are the foundation of every other calculation. If the system says 50 and the shelf holds 5, no forecast or reorder rule can save the next order.",
      ],
    ],
    mistakes: [
      ["Selling against on-hand stock instead of available stock."],
      ["Skipping adjustments for damage and returns, so on hand drifts from reality."],
    ],
    related: ["available-inventory", "allocated-inventory", "inventory-accuracy", "cycle-counting"],
    updated: U,
  },
  {
    slug: "available-inventory",
    term: "Available Inventory",
    short: "Available inventory",
    category: "inventory",
    definition:
      "Available inventory is on-hand stock minus units already allocated to orders or held, so it is the quantity you can actually sell or ship now.",
    explain: [
      [
        "It is the honest figure for days of supply and stock-out checks. Two warehouses with the same on-hand count can be in very different positions if one has most of its stock committed to a large order.",
      ],
      [
        "Holds are the part most often forgotten. Stock waiting for quality inspection, damaged units waiting for a credit from the supplier, and returns not yet checked all sit on the shelf but cannot be sold. Giving each of these its own status or location keeps available inventory honest without losing track of the units.",
      ],
    ],
    formula: ["Available = Quantity on Hand − Allocated − On Hold"],
    example: [
      [
        "Illustrative numbers: 500 on hand, 320 allocated to a contractor's order, 0 on hold. Available = 180. At 30 units a day that is 6 days of supply, not the 16 days the on-hand figure suggests.",
      ],
    ],
    why: [
      [
        "Using available rather than on-hand stock is what keeps a distributor from promising the same units to two customers.",
      ],
    ],
    mistakes: [
      ["Calculating days of supply from on-hand stock."],
      ["Leaving stale allocations from cancelled orders in place."],
    ],
    inApp: [
      "Supply Chain Manager calculates days of stock and stock-out risk from available quantity, not on-hand quantity.",
    ],
    related: ["quantity-on-hand", "allocated-inventory", "available-to-promise", "days-of-supply"],
    updated: U,
  },
  {
    slug: "allocated-inventory",
    term: "Allocated Inventory",
    short: "Allocated inventory",
    category: "inventory",
    definition:
      "Allocated inventory is stock that is still physically on hand but already reserved for a specific customer order, transfer or job.",
    explain: [
      [
        "Allocation happens when an order is confirmed and stock is set aside for it, before it is picked and shipped. Allocated stock still counts towards on-hand quantity but not towards available stock.",
      ],
      [
        "Systems differ on when allocation happens. Some allocate the moment a sales order is entered, others only when the order is released to the warehouse for picking. Whichever rule you use, the planning view needs to know which stock is truly free, or the same units will be promised twice when two large orders land on the same day.",
      ],
    ],
    example: [
      [
        "Illustrative: a customer orders 200 units for delivery next Thursday. The units are allocated today, so the sales team cannot promise them to anyone else, even though they will not leave the building for a week.",
      ],
    ],
    why: [
      [
        "Allocations show demand that is already certain. Ignoring them makes stock look healthier than it is; allocating too early, for orders far in the future, can block stock that could serve customers today.",
      ],
    ],
    mistakes: [
      ["Not releasing allocations when orders are cancelled or changed."],
      ["Allocating stock for orders weeks away while current orders go short."],
    ],
    related: ["available-inventory", "available-to-promise", "quantity-on-hand", "inventory-position"],
    updated: U,
  },
  {
    slug: "available-to-promise",
    term: "Available to Promise (ATP)",
    short: "ATP",
    category: "inventory",
    definition:
      "Available to promise (ATP) is the quantity you can commit to a new order by a given date, after current stock, incoming supply and existing commitments.",
    explain: [
      [
        "ATP looks forward in time. It starts from available stock, adds scheduled receipts such as open purchase orders, and subtracts orders already promised, period by period. It answers the sales question 'how many can I promise, and by when?'.",
      ],
      [
        "Many businesses calculate ATP only for items that are short or have large orders pending, because for well-stocked items the answer is simply 'yes, today'. Where it matters most is for scarce stock: allocating limited supply across customers by agreed priority instead of first come, first served.",
      ],
    ],
    formula: ["ATP (period) = Available stock + Scheduled receipts − Committed customer orders, through that period"],
    example: [
      [
        "Illustrative numbers: 100 available today, 300 arriving next week, 250 already promised for next week. You can promise 100 today and only 150 more for next week, not 400.",
      ],
    ],
    why: [
      [
        "Promising accurate dates keeps wholesale customers planning around you rather than around a competitor. ATP turns 'let me check with purchasing' into an immediate answer.",
      ],
    ],
    mistakes: [
      ["Promising against incoming stock with an unreliable supplier date."],
      ["Calculating ATP once a day while orders keep coming in."],
    ],
    related: ["available-inventory", "allocated-inventory", "inventory-position", "advance-shipping-notice"],
    updated: U,
  },
  {
    slug: "inventory-transfer",
    term: "Inventory Transfer (Stock Transfer)",
    short: "Inventory transfer",
    category: "inventory",
    definition:
      "An inventory transfer moves stock from one of your warehouses to another, usually to cover a shortage at one site using surplus held at another.",
    explain: [
      [
        "For a multi-warehouse distributor, a transfer is often the fastest and cheapest fix for a projected stockout: the stock is already owned, nearby and needs no supplier. It is also a way to clear slow-moving stock from a site where it does not sell to one where it does.",
      ],
      [
        "A transfer is demand for the sending warehouse and supply for the receiving one. Planning should count it on both sides.",
      ],
    ],
    example: [
      [
        "Illustrative numbers: Warehouse A has 6 days of supply on a SKU with a 14-day supplier lead time. Warehouse B, 200 km away, has 150 days of supply. Moving two weeks of A's demand from B covers the gap while A's purchase order is on its way.",
      ],
    ],
    why: [
      [
        "Transfers turn network-wide stock into availability where customers are, instead of buying more while surplus sits elsewhere.",
      ],
    ],
    mistakes: [
      ["Leaving transfers out at the source warehouse, so its demand looks lower than it is."],
      ["Transferring so much that the sending site runs short in turn."],
      ["Ignoring transfer freight and handling costs when comparing with a new order."],
    ],
    inApp: [
      "Supply Chain Manager counts transfers out as demand at the sending warehouse and can suggest a transfer when one site is short and another holds surplus.",
    ],
    related: ["multi-echelon-inventory", "pipeline-inventory", "days-of-supply", "expediting"],
    guides: ["reorder-expedite-or-transfer"],
    updated: U,
  },
  {
    slug: "multi-echelon-inventory",
    term: "Multi-Echelon Inventory",
    short: "Multi-echelon inventory",
    category: "inventory",
    definition:
      "Multi-echelon inventory is stock held at several linked levels of a supply network, such as a central warehouse feeding regional branches.",
    explain: [
      [
        "Each level, or echelon, replenishes from the one above. Planning each location separately tends to stack safety stock at every level. Planning the network as a whole lets you hold more buffer centrally and less at each branch for the same service.",
      ],
      [
        "Network planning also changes how branch replenishment works. Instead of each branch ordering from suppliers independently, branches replenish from the central warehouse on a frequent schedule, and the central warehouse buys for the whole network. That pooling of demand is what allows less total safety stock.",
      ],
    ],
    example: [
      [
        "Illustrative: a distributor with one national warehouse and five branches finds every branch carrying two weeks of safety stock on slow items. Holding most of that buffer centrally, with next-day transfers to branches, can cut total stock while keeping the same availability.",
      ],
    ],
    why: [
      [
        "As distributors add branches, inventory often grows faster than sales. A network view of where buffers sit is usually where the savings are.",
      ],
    ],
    mistakes: [
      ["Letting each branch set its own safety stock independently."],
      ["Measuring branch fill rate without counting stock available one transfer away."],
    ],
    related: ["inventory-transfer", "bullwhip-effect", "service-level", "pipeline-inventory"],
    updated: U,
  },
  {
    slug: "just-in-time",
    term: "Just-in-Time (JIT) Inventory",
    short: "JIT",
    category: "inventory",
    definition:
      "Just-in-time (JIT) is an approach that keeps inventory minimal by receiving goods only as they are needed, relying on short, reliable supply lead times.",
    explain: [
      [
        "JIT grew out of lean manufacturing. Its promise is lower inventory, less waste and problems exposed instead of hidden by stock. Its requirement is very reliable suppliers and steady demand; disruptions hit immediately because there is no buffer.",
      ],
      [
        "Many distributors exist precisely so their customers can run JIT: the distributor holds the buffer so the customer does not have to.",
      ],
      [
        "In practice most distributors run a mix: lean stock on items with short, reliable lead times and local suppliers, and deliberate buffers on items that are imported, seasonal or critical to customers. The right question is not whether to be JIT, but which SKUs can safely run with very little stock.",
      ],
    ],
    example: [
      [
        "Illustrative: a contractor buys fixings for each job only days before it starts, relying on a distributor's same-day availability. The distributor must then hold enough stock to make that promise.",
      ],
    ],
    why: [
      [
        "Understanding JIT customers explains your own demand. Their orders are frequent and small, and they switch supplier quickly when you are out of stock.",
      ],
    ],
    mistakes: [
      ["Adopting JIT on SKUs with long or unreliable lead times."],
      ["Cutting safety stock to JIT levels without fixing supplier reliability first."],
    ],
    related: ["lead-time-variability", "vendor-managed-inventory", "fill-rate", "cross-docking"],
    updated: U,
  },
  {
    slug: "vendor-managed-inventory",
    term: "Vendor-Managed Inventory (VMI)",
    short: "VMI",
    category: "purchasing",
    definition:
      "Vendor-managed inventory (VMI) is an arrangement where the supplier monitors the buyer's stock levels and decides when and how much to replenish.",
    explain: [
      [
        "The buyer shares stock and sales data, and agrees target minimum and maximum levels. The supplier raises the replenishment orders. Distributors can sit on either side: receiving VMI from a manufacturer, or running it for their own customers' storerooms.",
      ],
      [
        "The data feed is the foundation. VMI fails quickly if stock and usage figures arrive late or are inaccurate, because the vendor then replenishes against the wrong picture. Agreeing how often data is shared, who checks it and what happens when counts disagree avoids most of the disputes VMI programs run into.",
      ],
    ],
    example: [
      [
        "Illustrative: a distributor manages fastener bins at a manufacturer's plant, counting weekly and topping each bin to an agreed level. The customer never raises a PO for those items, and the distributor sees demand directly instead of guessing from erratic orders.",
      ],
    ],
    why: [
      [
        "Run well, VMI cuts the ", g("bullwhip-effect", "bullwhip effect"), " because the supplier sees real usage, and locks in the customer relationship. It does require trustworthy data and clear rules about who owns the stock and when.",
      ],
    ],
    mistakes: [
      ["Starting VMI without agreed min/max levels and review dates."],
      ["Unclear ownership of slow or obsolete stock that the vendor placed."],
    ],
    related: ["consignment-inventory", "min-max-inventory", "bullwhip-effect", "just-in-time"],
    updated: U,
  },
  {
    slug: "consignment-inventory",
    term: "Consignment Inventory",
    short: "Consignment inventory",
    category: "purchasing",
    definition:
      "Consignment inventory is stock held at the buyer's location but still owned by the supplier until it is used or sold, when the buyer is invoiced.",
    explain: [
      [
        "The buyer gets availability without tying up cash; the supplier gets shelf presence and secure demand. The details live in the contract: who insures the stock, how often usage is reported, and what happens to items that do not sell.",
      ],
      [
        "Consignment arrangements need regular reconciliation: what the supplier believes is at your site, what your system shows and what is physically there. Without it, disputes build up over shrinkage and slow items. A monthly usage report and an annual joint count are common ways to keep both sides aligned.",
      ],
    ],
    example: [
      [
        "Illustrative: a manufacturer places $50,000 of specialist valves in a distributor's warehouse on consignment. The distributor pays only when a valve ships to a customer and reports usage monthly.",
      ],
    ],
    why: [
      [
        "Consignment can be a good way to stock expensive, slow-moving lines a distributor could not otherwise justify. It needs separate tracking so consigned stock is not counted as your own inventory value.",
      ],
    ],
    mistakes: [
      ["Mixing consigned and owned stock in the same inventory records."],
      ["Not agreeing return terms for consigned items that do not sell."],
    ],
    related: ["vendor-managed-inventory", "inventory-carrying-cost", "slow-moving-inventory", "payment-terms"],
    updated: U,
  },
];
