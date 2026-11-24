import { g, type GlossaryTerm } from "./types";

const U = "2026-11-24";

/**
 * Stock-position terms, consolidated from 13 pages to 6 fuller ones
 * (docs/seo/glossary-merge-map.json). Removed slugs are redirected in
 * merged.ts. Product statements (`inApp`) were checked against the code on
 * 2026-11-24.
 */
export const STOCK_TERMS: GlossaryTerm[] = [
  {
    slug: "sku",
    term: "SKU (Stock Keeping Unit)",
    short: "SKU",
    metaTitle: "SKU and Unit of Measure: Definition & Examples",
    category: "inventory",
    definition:
      "A SKU (stock keeping unit) is your internal code for one distinct item you stock. The unit of measure says how that item is counted: each, case or pallet.",
    explain: [
      [
        "A SKU is yours; a manufacturer part number or a barcode (GTIN/UPC/EAN) belongs to the product. One product can have several SKUs, for example a single unit and a case of 12, and two suppliers' identical products can map to one SKU if you treat them as interchangeable.",
      ],
      [
        "Every inventory number, from on-hand stock to forecasts, is kept per SKU, usually per SKU per warehouse. Clean, consistent SKU codes are what make that data usable.",
      ],
    ],
    sections: [
      {
        title: "Unit of measure: the unit behind every quantity",
        paragraphs: [
          [
            "Unit of measure (UoM) is the unit an item is counted in, such as each, box, case or pallet, plus the conversions between them. Distributors often buy in one unit and sell in another: buy by the case of 12, sell by the each. Every stock figure, forecast and purchase order has to use the right unit, or quantities are wrong by a factor of 12.",
          ],
          [
            "A good rule is to pick one base unit per SKU, usually the smallest unit you sell, and store every other unit as a conversion to it. Purchase orders, receipts, sales and forecasts can then use whatever unit is natural, while every stock calculation runs in the same base unit. UoM errors are one of the most common causes of bad data imports and wildly wrong purchase orders.",
          ],
        ],
      },
      {
        title: "A clean SKU list checklist",
        bullets: [
          ["One SKU per sellable variant: size, color and pack size each get their own code if you plan or price them separately."],
          ["One SKU per interchangeable item, even when two suppliers provide it, so demand is not split across codes."],
          ["Never reuse a retired code for a different product."],
          ["Keep codes short and stable. Meaning encoded in the code (colors, sizes) breaks when the range changes."],
          ["Store one base unit and explicit conversions; never mix units in one column of an import file."],
        ],
      },
      {
        title: "SKU vs part number vs barcode",
        table: {
          head: ["Identifier", "Who owns it", "Used for"],
          rows: [
            ["SKU", "You", "Internal stock, planning, pricing"],
            ["Manufacturer part number", "The manufacturer", "Identifying the product across suppliers"],
            ["Barcode (GTIN, UPC, EAN)", "A standards body, assigned to the product", "Scanning at receiving and picking"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative: a distributor might use HRD-5005-10 for a 10-pack of a hinge and HRD-5005-01 for a single hinge, both pointing to the same manufacturer part number but planned, priced and stocked separately. For units: a supplier's price list is per case of 24, but your system records stock in eaches. A reorder of '50' sent without the unit could mean 50 eaches or 1,200, which is the kind of error that creates a year of overstock in one order.",
      ],
    ],
    why: [
      [
        "Duplicate or inconsistent SKUs split one item's demand across codes, so each looks slower than it is and both get under-ordered. Data imports, forecasting and reporting all depend on a clean SKU list and consistent units.",
      ],
    ],
    mistakes: [
      ["Reusing an old SKU code for a different product."],
      ["Creating a new SKU per supplier for the same interchangeable item."],
      ["Encoding so much meaning into codes that they break when the range changes."],
      ["Mixing units in the same column of an import file."],
      ["Changing a supplier's pack size without updating the conversion."],
    ],
    inApp: [
      "Supply Chain Manager's data importer maps your file's columns to SKUs and quantities. It treats a quantity as a count in your single base unit and does not convert units, so convert cases to eaches in your file before importing.",
    ],
    faq: [
      {
        q: "Is a SKU the same as a barcode?",
        a: ["No. A SKU is your internal code; a barcode identifies the product across the market. One product can have one barcode and several SKUs."],
      },
      {
        q: "How many SKUs is too many?",
        a: ["There is no number. The question is whether each SKU earns its carrying cost; see ABC analysis for how to find the ones that do not."],
      },
    ],
    related: ["abc-analysis", "quantity-on-hand", "cycle-stock", "kitting", "inventory-carrying-cost"],
    updated: U,
  },
  {
    slug: "quantity-on-hand",
    term: "Quantity on Hand",
    short: "Quantity on hand",
    metaTitle: "Quantity on Hand, Available Stock and Inventory Position",
    category: "inventory",
    definition:
      "Quantity on hand is the physical count of a SKU in a warehouse. Available stock, allocated stock and inventory position adjust it for what you can really sell.",
    explain: [
      [
        "Quantity on hand is the most basic inventory number and the one cycle counts check. It includes units reserved for open orders, held for quality checks or damaged, which is why it often differs from what you can actually sell. It is usually tracked per warehouse and often per bin location. Adding up on-hand across sites is useful for finance, but for planning each warehouse matters separately, because stock in one building cannot fill an order due today from another.",
      ],
    ],
    formula: ["Quantity on Hand = Opening stock + Receipts − Shipments ± Adjustments"],
    sections: [
      {
        title: "Allocated and available stock",
        paragraphs: [
          [
            "Allocated inventory is stock still physically on hand but already reserved for a specific customer order, transfer or job. Allocation happens when an order is confirmed and stock is set aside for it, before it is picked and shipped. Allocated stock still counts towards on-hand quantity but not towards available stock. Systems differ on when allocation happens: some allocate as soon as a sales order is entered, others only when it is released for picking.",
          ],
          [
            "Available inventory is on-hand stock minus units already allocated or held, so it is the quantity you can actually sell or ship now. Holds are the part most often forgotten: stock waiting for quality inspection, damaged units waiting for a supplier credit and returns not yet checked all sit on the shelf but cannot be sold. Giving each its own status or location keeps available inventory honest without losing track of the units. Using available rather than on-hand stock is what stops a distributor promising the same units to two customers.",
          ],
        ],
        formula: ["Available = Quantity on Hand − Allocated − On Hold"],
      },
      {
        title: "Inventory position: what you will have once everything lands",
        paragraphs: [
          [
            "Inventory position is stock on hand plus stock on order, minus backorders and committed stock. On-hand stock answers 'what is on the shelf?'. Inventory position answers 'what will I have once everything already in motion lands?'. It is the right trigger for reorder decisions because it looks forward: using on-hand alone ignores what is already coming, and using available stock alone ignores what has been ordered. Reorder triggers based on on-hand stock place a second order while the first is still on its way.",
          ],
          [
            "Count only purchase orders that will really arrive. A cancelled or long-overdue order is not stock on order, and including it hides a real shortage.",
          ],
        ],
        formula: ["Inventory Position = On Hand + On Order − Backorders − Allocated (committed) stock"],
      },
      {
        title: "Which number answers which question",
        table: {
          head: ["Number", "Answers", "Use it for"],
          rows: [
            ["Quantity on hand", "What is physically here?", "Cycle counts, finance"],
            ["Available inventory", "What can I sell or ship now?", "Days of supply, stockout checks, promising orders"],
            ["Inventory position", "What will I have once everything lands?", "Reorder triggers"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: 1,000 units on hand, 200 allocated to open orders and 20 on quality hold, so only 780 are available to promise to a new customer. At 30 units a day, 500 on hand with 320 allocated leaves 180 available: 6 days of supply, not the 16 days the on-hand figure suggests. For inventory position: 150 on hand, 400 on an open PO, 50 backordered and 30 allocated gives 150 + 400 − 50 − 30 = 470. With a reorder point of 300, no new order is needed yet, even though on-hand stock alone is below it.",
      ],
    ],
    why: [
      [
        "Accurate on-hand figures are the foundation of every other calculation. If the system says 50 and the shelf holds 5, no forecast or reorder rule can save the next order. Using position-based numbers on top of that prevents duplicate orders, a common source of overstock when lead times are long or several people raise purchase orders.",
      ],
    ],
    mistakes: [
      ["Selling against on-hand stock instead of available stock."],
      ["Skipping adjustments for damage and returns, so on hand drifts from reality."],
      ["Calculating days of supply from on-hand stock when much of it is allocated."],
      ["Triggering reorders from on-hand stock alone, or counting cancelled or stale purchase orders as on order."],
      ["Leaving stale allocations from cancelled orders in place."],
    ],
    inApp: [
      "Supply Chain Manager tracks the quantity on hand per SKU and warehouse and uses it for days of stock and stock-out checks. It does not track allocations or holds, so if much of your stock is reserved, subtract it in your data before importing. It credits open purchase orders in its projections but excludes overdue ones.",
    ],
    faq: [
      {
        q: "What is the difference between on hand and available?",
        a: ["On hand is everything physically present. Available subtracts units allocated to orders or held for other reasons."],
      },
      {
        q: "Which should trigger a reorder?",
        a: ["Inventory position, because it includes orders already on the way. On-hand alone causes duplicate orders."],
      },
    ],
    related: ["days-of-supply", "available-to-promise", "cycle-counting", "inventory-accuracy", "stockout"],
    guides: ["reorder-point-formula"],
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
        "ATP looks forward in time. It starts from available stock, adds scheduled receipts such as open purchase orders, and subtracts orders already promised, period by period. It answers the sales question 'how many can I promise, and by when?'. It is different from ",
        g("quantity-on-hand", "available stock"),
        ", which is a snapshot of today.",
      ],
      [
        "Many businesses calculate ATP only for items that are short or have large orders pending, because for well-stocked items the answer is simply 'yes, today'. Where it matters most is scarce stock: allocating limited supply across customers by agreed priority instead of first come, first served.",
      ],
    ],
    formula: ["ATP (period) = Available stock + Scheduled receipts − Committed customer orders, through that period"],
    sections: [
      {
        title: "Working out ATP period by period",
        paragraphs: [
          [
            "Build a short table by day or week. Start with available stock, add receipts due in each period, subtract orders already promised for that period, and carry the balance forward. The result in each column is what you can still promise for delivery by that date.",
          ],
        ],
        table: {
          head: ["Period", "Starting available", "Receipts", "Promised", "ATP"],
          rows: [
            ["Today", "100", "0", "0", "100"],
            ["Next week", "100", "300", "250", "150 more (250 cumulative)"],
          ],
        },
      },
      {
        title: "ATP versus available stock and inventory position",
        paragraphs: [
          [
            "These three numbers are easy to mix up. Available stock is a snapshot of what could ship today. Inventory position adds stock on order and is meant for deciding when to buy. ATP is a promise to a customer: it takes the same ingredients but spreads them over future dates and subtracts what is already committed, so it answers 'how many by which date?'. A purchasing planner mostly needs inventory position; a sales or customer service team mostly needs ATP.",
          ],
          [
            "ATP also changes the conversation with a customer. Instead of 'we are out of stock', the answer becomes 'we can ship 100 today and a further 150 on the 14th', which lets the customer plan around a short delay, accept a partial shipment or choose a substitute before the order is placed rather than after.",
          ],
        ],
      },
      {
        title: "Making ATP trustworthy",
        bullets: [
          ["Use realistic receipt dates. Promising against incoming stock from an unreliable supplier passes their lateness on to your customer."],
          ["Recalculate as orders arrive, not once a day, or two large orders can promise the same units."],
          ["Decide in advance how scarce stock is shared (by customer tier, by order date) so the rule is not made up under pressure."],
        ],
      },
    ],
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
      ["Using on-hand stock instead of available stock as the starting point."],
    ],
    inApp: [
      "Supply Chain Manager does not calculate available to promise and has no order promising. It projects stock day by day per SKU and warehouse against forecast demand and credits open purchase orders, which supports the same kind of question.",
    ],
    faq: [
      {
        q: "What is the difference between ATP and available inventory?",
        a: ["Available inventory is today's snapshot. ATP also counts future receipts and commitments, so it answers 'by when?'."],
      },
      {
        q: "Does a small distributor need ATP?",
        a: ["Mostly for scarce or long-lead items and large orders. For well-stocked items, available stock is enough."],
      },
    ],
    related: ["quantity-on-hand", "lead-time", "stockout", "days-of-supply", "on-time-delivery-rate"],
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
        "A transfer is demand for the sending warehouse and supply for the receiving one. Planning should count it on both sides, and stock in transit between sites should not be treated as available at the destination until it arrives.",
      ],
    ],
    sections: [
      {
        title: "Transfer, expedite or reorder?",
        paragraphs: [
          [
            "When a SKU is projected to run out before the next supplier delivery, three options compete. Reorder is right when the shortfall is a normal replenishment need with time to spare. Expedite is right when an order is already placed but late and the shortfall is short. Transfer is right when another warehouse holds more stock than it needs for its own lead time. The ",
            g("lead-time", "lead time"),
            " of each option, plus its freight cost, decides which one wins. See the guide below for a worked comparison.",
          ],
          [
            "Transfers work best when the network is deliberately balanced: fast movers stocked where they sell, with a known surplus site for slower lines. They work badly as a habit of rescuing one branch from another every week, because the same shortage will keep coming back until the reorder point at the short site is corrected. Treat a repeated transfer on the same SKU as a signal to review that warehouse's demand figure and safety stock.",
          ],
        ],
      },
      {
        title: "Checks before moving stock",
        bullets: [
          ["Does the sending site keep enough to cover its own demand over its own lead time? A transfer should not create the next stockout."],
          ["Compare transfer freight and handling with the cost of a new order or an expedite."],
          ["Count the transfer as demand at the sender and a scheduled receipt at the receiver."],
          ["Check transit time: a transfer that arrives after the stockout begins does not help."],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: Warehouse A has 6 days of supply on a SKU with a 14-day supplier lead time. Warehouse B, 200 km away, has 150 days of supply. Moving two weeks of A's demand from B covers the gap while A's purchase order is on its way.",
      ],
    ],
    why: [
      [
        "Transfers turn network-wide stock into availability where customers are, instead of buying more while surplus sits elsewhere. They are also the fastest way to start unwinding a slow-moving position at one site.",
      ],
    ],
    mistakes: [
      ["Leaving transfers out at the source warehouse, so its demand looks lower than it is."],
      ["Transferring so much that the sending site runs short in turn."],
      ["Ignoring transfer freight and handling costs when comparing with a new order."],
    ],
    inApp: [
      "Supply Chain Manager can recommend a transfer when one warehouse is projected to run short and another holds surplus. These recommendations are part of the Professional plan. The app suggests the move; you carry it out and record it in your own system.",
    ],
    faq: [
      {
        q: "When is a transfer better than a new purchase order?",
        a: ["When another site holds more than its own lead time needs and the transfer arrives before the stockout begins, at a lower total cost than a rush order."],
      },
      {
        q: "Does a transfer change my demand figures?",
        a: ["It should count as demand at the sending warehouse, not as a customer sale, so keep the two apart when analyzing sales."],
      },
    ],
    related: ["days-of-supply", "cycle-stock", "stockout", "lead-time", "on-time-delivery-rate"],
    guides: ["reorder-expedite-or-transfer"],
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
        "Many distributors exist precisely so their customers can run JIT: the distributor holds the buffer so the customer does not have to. Understanding JIT customers explains your own demand. Their orders are frequent and small, and they switch supplier quickly when you are out of stock.",
      ],
    ],
    sections: [
      {
        title: "Which SKUs can run lean",
        paragraphs: [
          [
            "In practice most distributors run a mix: lean stock on items with short, reliable lead times and local suppliers, and deliberate buffers on items that are imported, seasonal or critical to customers. The right question is not whether to be JIT, but which SKUs can safely run with very little stock.",
          ],
        ],
        table: {
          head: ["Condition", "Suits lean stock", "Needs a buffer"],
          rows: [
            ["Supplier lead time", "Short and consistent", "Long or erratic"],
            ["Demand", "Steady (X items)", "Erratic or seasonal (Z items)"],
            ["Source", "Local, reliable", "Imported, single source"],
            ["Impact of a stockout", "Low: substitutes exist", "High: customer cannot complete an order"],
          ],
        },
      },
      {
        title: "JIT from the distributor's side of the counter",
        paragraphs: [
          [
            "A distributor sits between two very different worlds. Upstream, you may buy in large lots from suppliers with long lead times. Downstream, your best customers want small, frequent, same-day deliveries. Their JIT is only possible because you hold the buffer, so your inventory is the cost of their leanness. That is a service worth pricing, through minimum order values, delivery charges or agreed stocking programs, rather than giving away.",
          ],
          [
            "It also means the cost of failure is lopsided. If a manufacturer runs JIT and a delivery slips, one line stops. If you run JIT on a SKU your contractor customers depend on and it slips, several customers stop at once, and they remember which supplier let them down. Reserve lean stock for items where a substitute exists or where a short delay is tolerated.",
          ],
        ],
      },
      {
        title: "Before cutting stock towards JIT levels",
        bullets: [
          ["Measure supplier lead time variability first. A buffer cut ahead of a reliability fix converts directly into stockouts."],
          ["Start with A/X items whose demand is steady and suppliers are close."],
          ["Keep a safety buffer on anything imported or seasonal, and review it after each disruption."],
        ],
      },
    ],
    example: [
      [
        "Illustrative: a contractor buys fixings for each job only days before it starts, relying on a distributor's same-day availability. The distributor must then hold enough stock to make that promise.",
      ],
    ],
    why: [
      [
        "JIT is a useful target for low-risk items and a dangerous default for the rest. Knowing why it works for some SKUs and not others keeps lean-inventory pressure from turning into stockouts.",
      ],
    ],
    mistakes: [
      ["Adopting JIT on SKUs with long or unreliable lead times, or measuring success only by lower inventory value without watching stockouts."],
      ["Cutting safety stock to JIT levels without fixing supplier reliability first."],
      ["Treating JIT as all-or-nothing instead of deciding SKU by SKU."],
    ],
    faq: [
      {
        q: "Is JIT suitable for a distributor?",
        a: ["For selected SKUs with short, reliable supply, yes. As a company-wide policy it conflicts with the distributor's role of holding stock for customers."],
      },
      {
        q: "How do I know a SKU is ready to run lean?",
        a: ["Look for steady demand, a nearby supplier whose last several deliveries were on time, and a substitute or a tolerant customer if a delivery slips. If any of the three is missing, keep a buffer."],
      },
      {
        q: "What is the biggest risk of JIT?",
        a: ["Any supplier delay or demand spike hits immediately, because there is no buffer to absorb it."],
      },
    ],
    related: ["lead-time", "service-level", "fill-rate", "abc-analysis", "vendor-managed-inventory"],
    updated: U,
  },
  {
    slug: "vendor-managed-inventory",
    term: "Vendor-Managed Inventory (VMI)",
    short: "VMI",
    metaTitle: "VMI and Consignment Inventory: Definition & Examples",
    category: "purchasing",
    definition:
      "Vendor-managed inventory (VMI) lets the supplier decide when and how much to replenish. Consignment stock is held by you but owned by the supplier.",
    explain: [
      [
        "In VMI the buyer shares stock and sales data and agrees target minimum and maximum levels. The supplier raises the replenishment orders. Distributors can sit on either side: receiving VMI from a manufacturer, or running it for their own customers' storerooms.",
      ],
      [
        "The data feed is the foundation. VMI fails quickly if stock and usage figures arrive late or are inaccurate, because the vendor then replenishes against the wrong picture. Agreeing how often data is shared, who checks it and what happens when counts disagree avoids most of the disputes VMI programs run into.",
      ],
    ],
    sections: [
      {
        title: "Consignment inventory",
        paragraphs: [
          [
            "Consignment inventory is stock held at the buyer's location but still owned by the supplier until it is used or sold, when the buyer is invoiced. The buyer gets availability without tying up cash; the supplier gets shelf presence and secure demand. The details live in the contract: who insures the stock, how often usage is reported, and what happens to items that do not sell.",
          ],
          [
            "Consignment needs regular reconciliation between what the supplier believes is at your site, what your system shows and what is physically there. A monthly usage report and an annual joint count are common ways to keep both sides aligned. Track consigned stock separately so it is not counted as your own inventory value, and agree return terms for items that do not sell.",
          ],
        ],
      },
      {
        title: "VMI versus consignment",
        table: {
          head: ["", "Vendor-managed inventory", "Consignment"],
          rows: [
            ["Who decides replenishment", "The supplier", "Usually the buyer, from agreed stock"],
            ["Who owns the stock until use", "Can be either; set by contract", "The supplier"],
            ["Main risk", "Bad data leads to wrong orders", "Disputes over shrinkage and slow items"],
            ["Often combined", "Yes: VMI on consigned stock", "Yes"],
          ],
        },
      },
      {
        title: "Agreements to settle before starting",
        bullets: [
          ["Agreed minimum and maximum levels and review dates."],
          ["How often stock and usage data are shared, and who checks it."],
          ["Who owns slow or obsolete stock the vendor placed, and the return terms."],
          ["Who insures the stock and who pays for shrinkage."],
        ],
      },
    ],
    example: [
      [
        "Illustrative: a distributor manages fastener bins at a manufacturer's plant, counting weekly and topping each bin to an agreed level. The customer never raises a PO for those items, and the distributor sees demand directly instead of guessing from erratic orders. For consignment: a manufacturer places $50,000 of specialist valves in a distributor's warehouse; the distributor pays only when a valve ships to a customer and reports usage monthly.",
      ],
    ],
    why: [
      [
        "Run well, VMI cuts the ",
        g("bullwhip-effect", "bullwhip effect"),
        " because the supplier sees real usage, and locks in the customer relationship. Consignment can be a good way to stock expensive, slow-moving lines a distributor could not otherwise justify. Both need trustworthy data and clear rules about who owns the stock and when.",
      ],
    ],
    mistakes: [
      ["Starting VMI without agreed min/max levels and review dates."],
      ["Unclear ownership of slow or obsolete stock that the vendor placed."],
      ["Mixing consigned and owned stock in the same inventory records."],
      ["Not agreeing return terms for consigned items that do not sell."],
    ],
    faq: [
      {
        q: "What is the difference between VMI and consignment?",
        a: ["VMI is about who decides replenishment. Consignment is about who owns the stock. They are often combined but are independent choices."],
      },
      {
        q: "Does VMI work for a small distributor?",
        a: ["Yes, on the customer side for a few key accounts, if you can count stock reliably and keep the data current."],
      },
    ],
    related: ["bullwhip-effect", "just-in-time", "min-max-inventory", "inventory-carrying-cost", "payment-terms"],
    updated: U,
  },
];
