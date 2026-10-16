import { g, type GlossaryTerm } from "./types";

const U = "2026-10-16";

export const WAREHOUSE_TERMS: GlossaryTerm[] = [
  {
    slug: "putaway",
    term: "Putaway",
    short: "Putaway",
    category: "warehouse",
    definition:
      "Putaway is the warehouse step of moving received goods from the dock to their storage location and recording where they were put.",
    explain: [
      [
        "Until putaway is complete, stock is in the building but often cannot be picked. Directed putaway, where the system tells the operator which location to use, keeps fast movers near the pick face and stops stock being scattered across random bins.",
      ],
      [
        "Putaway strategies vary. Fixed locations give each SKU a permanent home, which is simple and easy to learn. Random or dynamic locations put stock wherever there is space, which uses space better but depends on the system recording every location accurately.",
      ],
    ],
    example: [
      [
        "Illustrative: a pallet of 480 units arrives at 9 am. If it sits on the dock until the afternoon, morning orders for that SKU show as short even though the stock is ten metres away.",
      ],
    ],
    why: [
      [
        "Fast putaway shortens ", g("dock-to-stock-time", "dock-to-stock time"), " and keeps available stock accurate. Recording the exact location saves pickers from searching later.",
      ],
    ],
    mistakes: [
      ["Putting stock away without scanning the location, so the system cannot find it."],
      ["Letting received goods queue on the dock at busy times."],
    ],
    related: ["goods-receipt", "dock-to-stock-time", "bin-location", "slotting"],
    updated: U,
  },
  {
    slug: "order-picking",
    term: "Order Picking",
    short: "Order picking",
    category: "warehouse",
    definition:
      "Order picking is collecting the items for customer orders from their storage locations, usually the most labor-intensive job in a distribution warehouse.",
    explain: [
      [
        "Common methods are discrete picking (one order at a time), batch picking (several orders at once, sorted afterwards), zone picking (each picker covers an area) and wave picking (orders released in timed groups to match shipping cut-offs).",
      ],
      [
        "Method choice depends on order profile. Many small orders with few lines suit batch picking; a few large orders suit discrete picking; large warehouses with many zones suit zone or wave picking. Many distribution centers mix methods, using batch picking for small parcels and discrete picking for pallet orders.",
      ],
    ],
    formula: ["Pick Accuracy % = Order lines picked correctly ÷ Order lines picked × 100"],
    example: [
      [
        "Illustrative: a warehouse picking 1,200 small orders a day switches from discrete to batch picking for orders under five lines. Walking distance falls because each trip serves many orders, then items are sorted by order at a packing station.",
      ],
    ],
    why: [
      [
        "Picking speed and accuracy decide whether orders leave the same day and arrive complete. Mis-picks also corrupt inventory records: the wrong SKU leaves, and both counts go wrong.",
      ],
    ],
    mistakes: [
      ["Keeping fast movers in far corners, which multiplies walking time."],
      ["Picking without scanning, so errors are found only by the customer."],
    ],
    related: ["slotting", "bin-location", "order-cycle-time", "perfect-order-rate", "warehouse-management-system"],
    updated: U,
  },
  {
    slug: "bin-location",
    term: "Bin Location",
    short: "Bin location",
    category: "warehouse",
    definition:
      "A bin location is the specific, addressable place in a warehouse where stock is kept, typically coded by zone, aisle, rack, shelf and position.",
    explain: [
      [
        "A code such as A-12-03-B might mean zone A, aisle 12, bay 3, level B. With bin locations recorded, anyone can find any item, and the system can direct putaway and picking efficiently.",
      ],
      [
        "Many warehouses separate pick locations, which hold a small, easy-to-reach quantity for picking, from reserve or overflow locations, which hold full pallets. Pick locations are topped up from reserve before they empty, so pickers never have to fetch from high racks during order picking.",
      ],
    ],
    example: [
      [
        "Illustrative: a SKU is held in a pick bin at A-04-01-A and overflow pallets at R-20-02-C. Picking always goes to the pick bin, which is replenished from overflow when it runs low.",
      ],
    ],
    why: [
      [
        "Without bin locations, stock lives in people's heads. That breaks down as soon as staff change or the range grows, and it makes cycle counting slow.",
      ],
    ],
    mistakes: [
      ["Letting one SKU spread across many unrecorded locations."],
      ["Re-using location codes inconsistently between sites."],
    ],
    related: ["putaway", "slotting", "order-picking", "cycle-counting"],
    updated: U,
  },
  {
    slug: "slotting",
    term: "Slotting",
    short: "Slotting",
    category: "warehouse",
    definition:
      "Slotting is deciding which bin location each SKU should occupy, based on how often it is picked, its size and weight, and what it is usually ordered with.",
    explain: [
      [
        "Fast movers go in the easiest-to-reach locations near packing; heavy items go low; items often ordered together go near each other. Because demand changes, slotting needs reviewing from time to time.",
      ],
      [
        "A simple starting point is to rank SKUs by number of picks, not units, over the last few months, and give the top group the best locations. Units matter less than visits: a SKU picked 50 times a day in ones costs more walking than one picked twice a day in pallets.",
      ],
    ],
    example: [
      [
        "Illustrative: the top 5% of SKUs by pick frequency are moved to waist-height bins nearest the packing benches. Average walking per order drops because most picks now happen in a small area.",
      ],
    ],
    why: [
      [
        "Good slotting is one of the cheapest productivity gains in a warehouse: no new equipment, just stock in better places.",
      ],
    ],
    mistakes: [
      ["Slotting by SKU number or supplier rather than by pick frequency."],
      ["Never re-slotting after seasonal or range changes."],
    ],
    related: ["bin-location", "order-picking", "abc-analysis", "putaway"],
    updated: U,
  },
  {
    slug: "cross-docking",
    term: "Cross-Docking",
    short: "Cross-docking",
    category: "warehouse",
    definition:
      "Cross-docking moves inbound goods straight from receiving to outbound shipping, with little or no time in storage.",
    explain: [
      [
        "Goods arrive already destined for specific customers or branches, are sorted on the dock and loaded onto outbound vehicles, often within hours. It needs tight coordination between inbound arrivals and outbound departures.",
      ],
      [
        "There are two main forms. In pre-allocated cross-docking, the supplier labels goods for their final destination before shipping. In post-allocated cross-docking, the distributor decides where each item goes once it arrives. The first is faster on the dock; the second keeps more flexibility to send stock where it is needed most that day.",
      ],
    ],
    example: [
      [
        "Illustrative: a central warehouse receives a full truck from a supplier, splits it on the dock into five branch deliveries and sends them out the same evening, with none of it put away.",
      ],
    ],
    why: [
      [
        "Cross-docking cuts handling, storage and dock-to-stock time for goods that are already sold or allocated, such as branch replenishment and back-to-back orders.",
      ],
    ],
    mistakes: [
      ["Cross-docking without reliable ASNs, so the dock cannot plan the sort."],
      ["Using it for goods that still need inspection or relabelling."],
    ],
    related: ["dock-to-stock-time", "advance-shipping-notice", "back-to-back-order", "multi-echelon-inventory"],
    updated: U,
  },
  {
    slug: "dock-to-stock-time",
    term: "Dock-to-Stock Time",
    short: "Dock-to-stock time",
    category: "warehouse",
    definition:
      "Dock-to-stock time is how long it takes from goods arriving at the receiving dock until they are put away and available to pick.",
    explain: [
      [
        "It covers unloading, checking against the PO or ASN, any inspection, labelling and putaway. Every hour of it is part of your real lead time, even though the supplier has already delivered.",
      ],
      [
        "Common causes of slow dock-to-stock time are deliveries arriving without notice, receiving paperwork that does not match the PO, quality checks that wait for one person and putaway done in batches at the end of the day. Fixing the first two often requires nothing more than asking suppliers for ASNs and clean PO references.",
      ],
    ],
    formula: ["Dock-to-Stock Time = Time available for picking − Time goods arrived at dock"],
    example: [
      [
        "Illustrative numbers: if receipts typically wait 1.5 days before putaway, a supplier lead time of 7 days is really 8.5 days for planning. Cutting the wait to same day takes 1.5 days off every SKU's effective lead time.",
      ],
    ],
    why: [
      [
        "Shorter dock-to-stock time makes received stock sellable sooner and lowers the safety stock needed, without asking anything of suppliers.",
      ],
    ],
    mistakes: [
      ["Leaving dock-to-stock time out of planning lead time."],
      ["Measuring from paperwork rather than physical arrival."],
    ],
    related: ["putaway", "goods-receipt", "lead-time", "cross-docking"],
    updated: U,
  },
  {
    slug: "order-cycle-time",
    term: "Order Cycle Time (Customer)",
    short: "Order cycle time",
    category: "warehouse",
    definition:
      "Customer order cycle time is how long it takes from a customer placing an order to receiving it, the delivery speed your customers actually experience.",
    explain: [
      [
        "It includes order entry, credit checks, picking, packing, shipping and transit. It is distinct from PO cycle time, which measures your suppliers' speed to you.",
      ],
      [
        "Breaking cycle time into its steps shows where time goes. Order entry, credit holds, waiting for picking, picking itself, packing, waiting for the carrier and transit each add hours or days. Often the largest gaps are waiting times between steps rather than the steps themselves.",
      ],
    ],
    formula: ["Order Cycle Time = Delivery date − Order date"],
    example: [
      [
        "Illustrative: orders placed before 2 pm ship the same day and arrive next day, a one-day cycle. Orders that hit a stockout wait for a backorder and may take ten days, which drags the average and frustrates the customer.",
      ],
    ],
    why: [
      [
        "For many wholesale buyers, speed and reliability of delivery matter as much as price. Tracking cycle time per customer shows where service is slipping.",
      ],
    ],
    mistakes: [
      ["Measuring to the ship date and ignoring transit time."],
      ["Reporting the average and hiding the long tail of late orders."],
    ],
    related: ["perfect-order-rate", "fill-rate", "order-picking", "po-cycle-time"],
    updated: U,
  },
  {
    slug: "perfect-order-rate",
    term: "Perfect Order Rate",
    short: "Perfect order rate",
    category: "warehouse",
    definition:
      "Perfect order rate is the share of customer orders delivered complete, on time, undamaged and with correct paperwork, all at once.",
    explain: [
      [
        "It multiplies several failure points together, so it is always lower than any single measure. An order that arrives on time but one line short, or complete but with a wrong invoice, is not perfect.",
      ],
      [
        "Which components to include depends on what your customers care about. Some add invoice accuracy or correct pricing; others add delivery within a time window. The value is in choosing a definition that matches the customer's view of a good order and tracking it consistently.",
      ],
    ],
    formula: ["Perfect Order Rate ≈ % on time × % complete × % undamaged × % correct documentation"],
    example: [
      [
        "Illustrative numbers: 95% on time, 96% complete, 99% undamaged and 98% correct paperwork. Perfect order rate ≈ 0.95 × 0.96 × 0.99 × 0.98 ≈ 88%. Roughly one order in eight has some problem.",
      ],
    ],
    why: [
      [
        "It is the measure closest to how a customer remembers you. Breaking it into components shows which part of the process to fix first.",
      ],
    ],
    mistakes: [
      ["Reporting each component separately and never the combined figure."],
      ["Counting an order as complete once a backorder later ships."],
    ],
    related: ["fill-rate", "order-cycle-time", "on-time-delivery-rate", "order-picking"],
    updated: U,
  },
  {
    slug: "less-than-truckload",
    term: "Less-Than-Truckload (LTL) Freight",
    short: "LTL",
    category: "warehouse",
    definition:
      "Less-than-truckload (LTL) freight is a shipment too small to fill a truck, carried alongside other shippers' goods and priced by weight, size and distance.",
    explain: [
      [
        "LTL is cheaper than paying for a full truck (FTL) for a few pallets, but it usually takes longer because freight is consolidated and moved through carrier terminals, and it has more handling and more chance of damage.",
      ],
      [
        "LTL pricing is usually based on freight class, which reflects density, ease of handling and liability, as well as weight and distance. Light, bulky goods cost more for their weight than dense ones. Accurate weights and dimensions on each shipment avoid re-classification charges from the carrier.",
      ],
    ],
    example: [
      [
        "Illustrative: an order of 4 pallets goes LTL; an order of 22 pallets books a full truck. Grouping two suppliers' orders into one collection, or ordering slightly more often in full loads, can move freight from LTL to cheaper per-pallet FTL rates.",
      ],
    ],
    why: [
      [
        "Freight is a meaningful part of landed cost. Order size and frequency decisions should account for the freight band they land in, not just unit price.",
      ],
    ],
    mistakes: [
      ["Ignoring freight class and density, which drive LTL pricing."],
      ["Comparing supplier quotes without the inbound freight they imply."],
    ],
    related: ["landed-cost", "third-party-logistics", "economic-order-quantity", "total-cost-of-ownership"],
    updated: U,
  },
  {
    slug: "third-party-logistics",
    term: "Third-Party Logistics (3PL)",
    short: "3PL",
    category: "warehouse",
    definition:
      "A third-party logistics provider (3PL) is an outside company that runs warehousing, fulfilment or transport for you, under contract.",
    explain: [
      [
        "Distributors use 3PLs to add a region without opening their own building, to handle seasonal peaks, or to outsource transport. You still own the stock and the planning; the 3PL handles the physical operation.",
      ],
      [
        "Contracts with 3PLs are typically priced per pallet stored, per order picked and per line or unit handled. Understanding which of those drives your bill helps decide which SKUs to hold there: slow, bulky items can cost more in storage than they earn.",
      ],
    ],
    example: [
      [
        "Illustrative: a distributor serves a new region from a 3PL warehouse holding its top 300 SKUs, replenished weekly from the main warehouse, before deciding whether demand justifies its own branch.",
      ],
    ],
    why: [
      [
        "A 3PL turns fixed warehouse costs into variable ones. The planning challenge is the same as any extra location: deciding which SKUs to hold there and in what quantity.",
      ],
    ],
    mistakes: [
      ["Not getting daily stock data from the 3PL, so planning runs on stale numbers."],
      ["Holding the full range at a 3PL site when only fast movers sell there."],
    ],
    related: ["multi-echelon-inventory", "warehouse-management-system", "inventory-transfer", "less-than-truckload"],
    updated: U,
  },
  {
    slug: "warehouse-management-system",
    term: "Warehouse Management System (WMS)",
    short: "WMS",
    category: "warehouse",
    definition:
      "A warehouse management system (WMS) is software that directs and records physical warehouse work: receiving, putaway, picking, packing, shipping and counts.",
    explain: [
      [
        "An ERP or inventory system knows how much stock you have; a WMS knows exactly where each unit is and tells staff what to do next. Smaller distributors often run warehouse tasks inside their ERP; larger ones add a dedicated WMS.",
      ],
      [
        "A WMS does not decide how much to buy. Demand forecasting and replenishment planning sit on top of the inventory data that the WMS and ERP produce.",
      ],
    ],
    example: [
      [
        "Illustrative: with a WMS, a picker scans a location and item for every line, the system confirms the pick and updates stock in real time, and mis-picks are caught before the order is packed.",
      ],
    ],
    why: [
      [
        "Accurate, real-time warehouse data is what every planning tool depends on. A WMS raises inventory accuracy, which makes forecasts and reorder points trustworthy.",
      ],
    ],
    mistakes: [
      ["Expecting a WMS to fix purchasing decisions, which it does not make."],
      ["Running the WMS and ERP with different stock figures and no reconciliation."],
    ],
    related: ["inventory-accuracy", "order-picking", "putaway", "bin-location"],
    updated: U,
  },
  {
    slug: "cycle-counting",
    term: "Cycle Counting",
    short: "Cycle counting",
    category: "warehouse",
    definition:
      "Cycle counting checks stock accuracy by counting a small set of locations or SKUs every day or week, so the whole warehouse is covered on a rolling basis.",
    explain: [
      [
        "It replaces or reduces the annual shutdown stocktake. Because counts are small and frequent, errors are found close to when they happened, when the cause is still traceable. Many teams count A items more often than C items.",
      ],
      [
        "Counts can be scheduled by class (A items more often), by location (every aisle in turn) or triggered by events, such as a bin reaching zero or a picker reporting a shortage. Event-based counts are cheap because the bin is empty or nearly empty, which makes it quick to check whether the system agrees.",
      ],
    ],
    example: [
      [
        "Illustrative: a warehouse with 3,000 SKUs counts A items monthly, B items quarterly and C items twice a year, which works out to a few dozen counts a day, done in the quiet hour before afternoon picking.",
      ],
    ],
    why: [
      [
        "Every replenishment number depends on on-hand stock being right. Cycle counting keeps it right continuously instead of once a year.",
      ],
    ],
    mistakes: [
      ["Correcting the count without investigating why it was wrong."],
      ["Counting while stock is moving, which creates false variances."],
    ],
    related: ["physical-inventory-count", "inventory-accuracy", "abc-analysis", "inventory-shrinkage"],
    updated: U,
  },
  {
    slug: "physical-inventory-count",
    term: "Physical Inventory Count (Stocktake)",
    short: "Physical inventory count",
    category: "warehouse",
    definition:
      "A physical inventory count, or stocktake, counts every item in a warehouse at one point in time, usually with operations paused, to verify stock records.",
    explain: [
      [
        "It is often required for year-end accounts. It gives a complete snapshot, but it is disruptive, prone to tired-counter errors and finds problems long after they happened.",
      ],
      [
        "Preparation decides how well a stocktake goes: tidy locations, completed receipts and shipments, pre-printed or scanner-based count sheets, and blind counts where counters do not see the expected quantity. Recounting only the largest variances, rather than everything, keeps the process manageable.",
      ],
    ],
    example: [
      [
        "Illustrative: a distributor closes its warehouse for a weekend each December. Counts reveal a few hundred SKUs with variances; most are explained by unrecorded returns and mis-picks earlier in the year.",
      ],
    ],
    why: [
      [
        "Many businesses use a strong cycle-counting program to shorten or replace the annual count, with agreement from their accountants.",
      ],
    ],
    mistakes: [
      ["Leaving receiving and shipping running during the count."],
      ["Writing off variances without finding their cause."],
    ],
    related: ["cycle-counting", "inventory-accuracy", "inventory-shrinkage", "inventory-write-off"],
    updated: U,
  },
  {
    slug: "inventory-accuracy",
    term: "Inventory Accuracy (Record Accuracy)",
    short: "Inventory accuracy",
    category: "warehouse",
    definition:
      "Inventory accuracy is how often the stock quantity in your system matches what is physically on the shelf, measured from counts.",
    explain: [
      [
        "It is usually measured as the share of counted SKU-locations whose system quantity matches the physical count, sometimes within a small tolerance. Value-based measures can hide errors, because overs and unders cancel out.",
      ],
      [
        "A tolerance can be sensible for small, cheap items counted in large quantities, such as screws sold by weight. For high-value or serialized items, the standard should be an exact match. Tracking accuracy separately by zone or category shows where the process is breaking, which is more useful than one overall figure.",
      ],
    ],
    formula: ["Inventory Accuracy % = Counted SKU-locations that match ÷ SKU-locations counted × 100"],
    example: [
      [
        "Illustrative numbers: 400 locations counted, 372 match exactly. Accuracy = 93%. The other 28 are where the next stockout or false reorder will come from.",
      ],
    ],
    why: [
      [
        "No forecast or reorder rule can work on wrong stock figures. Poor accuracy causes both phantom stock (system says yes, shelf says no) and unnecessary reorders.",
      ],
    ],
    mistakes: [
      ["Measuring only total value, where errors cancel out."],
      ["Allowing manual stock adjustments without a reason code."],
    ],
    related: ["cycle-counting", "physical-inventory-count", "quantity-on-hand", "warehouse-management-system"],
    updated: U,
  },
  {
    slug: "inventory-shrinkage",
    term: "Inventory Shrinkage",
    short: "Inventory shrinkage",
    category: "warehouse",
    definition:
      "Inventory shrinkage is the loss of stock between what the records say you should have and what you actually have, from damage, theft, errors or spoilage.",
    explain: [
      [
        "Shrinkage shows up as negative count adjustments. Some is physical loss; much is process error, such as unrecorded returns, mis-picks booked against the wrong SKU and receiving mistakes.",
      ],
      [
        "Reason codes make shrinkage manageable. Recording each adjustment as damage, theft, expiry, receiving error, picking error or unknown turns one annual loss figure into a list of specific problems. Often a large share turns out to be process errors that can be fixed, rather than physical loss.",
      ],
    ],
    formula: ["Shrinkage % = (Recorded inventory value − Actual inventory value) ÷ Recorded inventory value × 100"],
    example: [
      [
        "Illustrative numbers: records show $500,000 of stock; the count finds $492,500. Shrinkage is $7,500, or 1.5%. Tracing adjustments by reason may show most of it came from damage in one zone.",
      ],
    ],
    why: [
      [
        "Shrinkage is lost margin. It also hides inside demand data if losses are booked as sales, which then inflates forecasts.",
      ],
    ],
    mistakes: [
      ["Writing off shrinkage as a single annual number without reasons."],
      ["Booking lost or damaged stock as sales."],
    ],
    related: ["inventory-accuracy", "cycle-counting", "inventory-write-off", "physical-inventory-count"],
    updated: U,
  },
  {
    slug: "kitting",
    term: "Kitting",
    short: "Kitting",
    category: "warehouse",
    definition:
      "Kitting is grouping separate SKUs into one kit that is sold and shipped as a single item, such as a valve with its fittings and seals.",
    explain: [
      [
        "Kits can be pre-assembled and stocked, or assembled to order. Either way, selling a kit consumes the component SKUs, so component demand has to include kit sales.",
      ],
      [
        "There are two ways to stock kits. Pre-built kits are picked faster but lock components into kits that might not sell. Assemble-to-order kits keep components flexible but add work at picking time. Many distributors pre-build only their fastest-selling kits and assemble the rest when ordered.",
      ],
    ],
    example: [
      [
        "Illustrative: a kit of 1 pump, 2 hoses and 4 clamps sells 50 a month. Each clamp's demand includes 200 a month from the kit, on top of clamps sold on their own.",
      ],
    ],
    why: [
      [
        "Kits raise order value and simplify buying for customers. If component demand ignores kit sales, the kit will go out of stock because one cheap component ran out.",
      ],
    ],
    mistakes: [
      ["Forecasting components without exploding kit sales into component demand."],
      ["Pre-building more kits than demand supports, locking up components."],
    ],
    related: ["unit-of-measure", "sku", "order-picking", "back-to-back-order"],
    updated: U,
  },
  {
    slug: "unit-of-measure",
    term: "Unit of Measure (UoM)",
    short: "Unit of measure",
    category: "warehouse",
    definition:
      "Unit of measure (UoM) is the unit an item is counted in, such as each, box, case or pallet, plus the conversions between them.",
    explain: [
      [
        "Distributors often buy in one unit and sell in another: buy by the case of 12, sell by the each. Every stock figure, forecast and purchase order has to use the right unit, or quantities are wrong by a factor of 12.",
      ],
      [
        "A good rule is to pick one base unit per SKU, usually the smallest unit you sell, and store every other unit as a conversion to it. Purchase orders, receipts, sales and forecasts can then use whatever unit is natural, while every stock calculation runs in the same base unit.",
      ],
    ],
    example: [
      [
        "Illustrative: a supplier's price list is per case of 24, but your system records stock in eaches. A reorder of '50' sent without the unit could mean 50 eaches or 1,200, which is the kind of error that creates a year of overstock in one order.",
      ],
    ],
    why: [
      [
        "UoM errors are one of the most common causes of bad imports and wildly wrong purchase orders. Storing one base unit and explicit conversions avoids them.",
      ],
    ],
    mistakes: [
      ["Mixing units in the same column of an import file."],
      ["Changing a supplier's pack size without updating the conversion."],
    ],
    related: ["sku", "kitting", "minimum-order-quantity", "purchase-order"],
    updated: U,
  },
  {
    slug: "lot-tracking",
    term: "Lot Tracking (Batch Tracking)",
    short: "Lot tracking",
    category: "warehouse",
    definition:
      "Lot tracking records which production batch each unit belongs to, so every lot can be traced from supplier receipt to the customers who received it.",
    explain: [
      [
        "It matters for regulated and perishable goods: food, chemicals, pharmaceuticals and many industrial products. If a supplier recalls a lot, you can find exactly where it went instead of recalling everything.",
      ],
      [
        "For lot tracking to work, the lot must be captured at every step: receiving, putaway, picking and shipping. A single step that skips the scan breaks the chain, and a recall then has to fall back on broad estimates. Barcode labels that carry the lot number make this practical without slowing the warehouse down.",
      ],
    ],
    example: [
      [
        "Illustrative: a supplier recalls lot 23-118 of a sealant. With lot tracking, the distributor finds 140 units still in stock and 6 customers who received the rest, and contacts only them.",
      ],
    ],
    why: [
      [
        "Lot tracking limits the cost of a recall and is often required by customers or regulators. It also supports first-expired-first-out picking.",
      ],
    ],
    mistakes: [
      ["Recording lots at receiving but not at picking, which breaks the trace."],
      ["Mixing lots in the same bin without recording them."],
    ],
    related: ["fefo", "serialized-inventory", "goods-receipt", "fifo"],
    updated: U,
  },
  {
    slug: "serialized-inventory",
    term: "Serialized Inventory",
    short: "Serialized inventory",
    category: "warehouse",
    definition:
      "Serialized inventory tracks each individual unit by a unique serial number, rather than tracking only quantities, so every item's history is known.",
    explain: [
      [
        "It is common for equipment, electronics and anything with a warranty. Where lot tracking follows a batch, serialization follows one unit: which supplier, when received, which customer, and any returns.",
      ],
      [
        "Serial numbers are often captured at receiving, from a barcode on each unit, and again at shipping. In between, the system knows which serials are in which location. That makes it possible to answer questions like 'which customers received units from this batch?' or 'is this returned unit actually one we sold?'.",
      ],
    ],
    example: [
      [
        "Illustrative: a customer returns a controller under warranty. The serial number shows it shipped 14 months ago from a lot with a known defect, so the claim goes straight to the manufacturer.",
      ],
    ],
    why: [
      [
        "Serialization supports warranties, returns and theft prevention for high-value items. It adds a scan at every movement, so it is usually reserved for items that justify it.",
      ],
    ],
    mistakes: [
      ["Serializing low-value items where the scanning cost outweighs the benefit."],
      ["Allowing units to move without scanning the serial number."],
    ],
    related: ["lot-tracking", "inventory-accuracy", "warehouse-management-system", "sku"],
    updated: U,
  },
  {
    slug: "fefo",
    term: "FEFO (First Expired, First Out)",
    short: "FEFO",
    category: "warehouse",
    definition:
      "FEFO (first expired, first out) is a picking rule that ships the units with the earliest expiry date first, whatever order they arrived in.",
    explain: [
      [
        "It is the standard for perishable and dated goods. It differs from FIFO when a later delivery has a shorter shelf life than stock already on hand. FEFO needs lot or expiry dates recorded at receiving.",
      ],
      [
        "FEFO only works if the warehouse can see expiry dates at the point of picking, either on a scanned label or in the system. It also changes replenishment: if typical shelf life on arrival is short, order quantities need to be small enough to sell well before expiry, even if a larger order earns a better price.",
      ],
    ],
    example: [
      [
        "Illustrative: lot A arrived first with expiry in March; lot B arrived a week later with expiry in February. FIFO ships lot A first; FEFO ships lot B first, so less stock expires on the shelf.",
      ],
    ],
    why: [
      [
        "For distributors of food, chemicals or adhesives, expired stock is a write-off. FEFO keeps waste down, and many customers require a minimum remaining shelf life on delivery.",
      ],
    ],
    mistakes: [
      ["Not recording expiry dates at receiving."],
      ["Ordering quantities that cannot sell before expiry at the current pace."],
    ],
    related: ["fifo", "lot-tracking", "obsolete-inventory", "inventory-write-off"],
    updated: U,
  },
];
