import { g, type GlossaryTerm } from "./types";

const U = "2026-11-24";

/**
 * Warehouse and logistics terms, consolidated from 19 pages to 7 fuller ones
 * (docs/seo/glossary-merge-map.json). Removed slugs are redirected in
 * merged.ts. Product statements (`inApp`) were checked against
 * src/lib/metrics/warehouse.ts, logistics.ts and prisma/schema.prisma on
 * 2026-11-24.
 */
export const WAREHOUSE_TERMS: GlossaryTerm[] = [
  {
    slug: "putaway",
    term: "Putaway",
    short: "Putaway",
    metaTitle: "Putaway, Bin Locations and Slotting Explained",
    category: "warehouse",
    definition:
      "Putaway moves received goods from the dock to storage and records where they went. Bin locations and slotting decide where they should go.",
    explain: [
      [
        "Until putaway is complete, stock is in the building but often cannot be picked. Directed putaway, where the system tells the operator which location to use, keeps fast movers near the pick face and stops stock being scattered across random bins.",
      ],
      [
        "Putaway strategies vary. Fixed locations give each SKU a permanent home, which is simple and easy to learn. Random or dynamic locations put stock wherever there is space, which uses space better but depends on the system recording every location accurately.",
      ],
    ],
    formula: ["Dock-to-Stock Time = Time goods are available for picking − Time goods arrived at the dock"],
    sections: [
      {
        title: "Bin locations: an address for every item",
        paragraphs: [
          [
            "A bin location is the specific, addressable place where stock is kept, typically coded by zone, aisle, rack, shelf and position. A code such as A-12-03-B might mean zone A, aisle 12, bay 3, level B. With bin locations recorded, anyone can find any item, and the system can direct putaway and picking efficiently. Without them, stock lives in people's heads, which breaks down as soon as staff change or the range grows, and it makes cycle counting slow.",
          ],
          [
            "Many warehouses separate pick locations, which hold a small, easy-to-reach quantity, from reserve or overflow locations, which hold full pallets. Pick locations are topped up from reserve before they empty, so pickers never have to fetch from high racks during order picking.",
          ],
        ],
      },
      {
        title: "Slotting: choosing the best place for each SKU",
        paragraphs: [
          [
            "Slotting decides which bin location each SKU should occupy, based on how often it is picked, its size and weight, and what it is usually ordered with. Fast movers go in the easiest-to-reach locations near packing, heavy items go low, and items often ordered together go near each other. Because demand changes, slotting needs reviewing from time to time.",
          ],
          [
            "A simple starting point is to rank SKUs by number of picks, not units, over the last few months, and give the top group the best locations. Units matter less than visits: a SKU picked 50 times a day in ones costs more walking than one picked twice a day in pallets. Good slotting is one of the cheapest productivity gains in a warehouse: no new equipment, just stock in better places.",
          ],
        ],
      },
      {
        title: "Dock-to-stock time: the hidden part of lead time",
        paragraphs: [
          [
            "Dock-to-stock time is how long it takes from goods arriving at the receiving dock until they are put away and available to pick. It covers unloading, checking against the PO or ASN, any inspection, labelling and putaway. Every hour of it is part of your real ",
            g("lead-time", "lead time"),
            ", even though the supplier has already delivered.",
          ],
          [
            "Common causes of slow dock-to-stock time are deliveries arriving without notice, receiving paperwork that does not match the PO, quality checks that wait for one person and putaway done in batches at the end of the day. Fixing the first two often needs nothing more than asking suppliers for advance notices and clean PO references.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: a pallet of 480 units arrives at 9 am. If it sits on the dock until the afternoon, morning orders for that SKU show as short even though the stock is ten metres away. If receipts typically wait 1.5 days before putaway, a supplier lead time of 7 days is really 8.5 days for planning, and cutting the wait to same day takes 1.5 days off every SKU's effective lead time. For slotting: moving the top 5% of SKUs by pick frequency to waist-height bins nearest the packing benches cuts the walking in each order.",
      ],
    ],
    why: [
      [
        "Fast putaway shortens dock-to-stock time and keeps available stock accurate, and recording the exact location saves pickers from searching later. Together with good slotting, it is a no-purchase way to raise warehouse throughput and lower the safety stock the lead time forces you to hold.",
      ],
    ],
    mistakes: [
      ["Putting stock away without scanning the location, so the system cannot find it."],
      ["Letting received goods queue on the dock at busy times."],
      ["Letting one SKU spread across many unrecorded locations, or reusing location codes inconsistently between sites."],
      ["Slotting by SKU number or supplier rather than by pick frequency, and never re-slotting after range changes."],
      ["Leaving dock-to-stock time out of planning lead time, or measuring from paperwork rather than physical arrival."],
    ],
    inApp: [
      "Supply Chain Manager tracks stock per SKU and warehouse. It does not record bin locations, putaway, slotting or dock-to-stock time, so add measured dock-to-stock days to the lead time you enter for each supplier.",
    ],
    faq: [
      {
        q: "What is the difference between putaway and slotting?",
        a: ["Putaway is the task of moving received goods into storage. Slotting is the planning decision about where each SKU should live."],
      },
      {
        q: "How do I measure dock-to-stock time?",
        a: ["Record when a delivery physically arrives and when it becomes pickable in the system, for a sample of receipts, and take the average and the longest."],
      },
    ],
    related: ["three-way-match", "order-picking", "cycle-counting", "lead-time", "warehouse-management-system"],
    updated: U,
  },
  {
    slug: "order-picking",
    term: "Order Picking",
    short: "Order picking",
    metaTitle: "Order Picking, Kitting and Order Cycle Time Explained",
    category: "warehouse",
    definition:
      "Order picking is collecting items for customer orders from storage, usually the most labor-intensive warehouse job. Kitting and cycle time build on it.",
    explain: [
      [
        "Common methods are discrete picking (one order at a time), batch picking (several orders at once, sorted afterwards), zone picking (each picker covers an area) and wave picking (orders released in timed groups to match shipping cut-offs).",
      ],
      [
        "Method choice depends on order profile. Many small orders with few lines suit batch picking; a few large orders suit discrete picking; large warehouses with many zones suit zone or wave picking. Many distribution centers mix methods, using batch picking for small parcels and discrete picking for pallet orders.",
      ],
    ],
    formula: ["Pick Accuracy % = Order lines picked correctly ÷ Order lines picked × 100"],
    sections: [
      {
        title: "Kitting: several SKUs sold as one",
        paragraphs: [
          [
            "Kitting groups separate SKUs into one kit that is sold and shipped as a single item, such as a valve with its fittings and seals. Selling a kit consumes the component SKUs, so component demand has to include kit sales, or the kit goes out of stock because one cheap component ran out.",
          ],
          [
            "There are two ways to stock kits. Pre-built kits are picked faster but lock components into kits that might not sell. Assemble-to-order kits keep components flexible but add work at picking time. Many distributors pre-build only their fastest-selling kits and assemble the rest when ordered.",
          ],
        ],
      },
      {
        title: "Order cycle time: what the customer experiences",
        paragraphs: [
          [
            "Customer order cycle time is how long it takes from a customer placing an order to receiving it. It includes order entry, credit checks, picking, packing, shipping and transit, and it is distinct from purchase order cycle time, which measures your suppliers' speed to you. Breaking it into steps shows where time goes: often the largest gaps are waiting times between steps rather than the steps themselves.",
          ],
          [
            "Track it per customer, measure to delivery rather than to the ship date, and watch the long tail, not only the average. Orders that hit a stockout wait for a backorder and may take ten days, which drags the average and frustrates the customer.",
          ],
        ],
        formula: ["Order Cycle Time = Delivery date − Order date"],
      },
      {
        title: "Choosing a picking method",
        table: {
          head: ["Method", "Best for", "Watch out for"],
          rows: [
            ["Discrete", "Few, large orders", "Lots of walking per line"],
            ["Batch", "Many small orders with few lines", "Needs a sorting step after picking"],
            ["Zone", "Large buildings with many areas", "Orders must be consolidated across zones"],
            ["Wave", "Fixed carrier cut-offs", "Peaks and idle time between waves"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative: a warehouse picking 1,200 small orders a day switches from discrete to batch picking for orders under five lines. Walking distance falls because each trip serves many orders, then items are sorted by order at a packing station. For kitting: a kit of 1 pump, 2 hoses and 4 clamps sells 50 a month, so each clamp's demand includes 200 a month from the kit, on top of clamps sold on their own. For cycle time: orders placed before 2 pm ship the same day and arrive next day, a one-day cycle.",
      ],
    ],
    why: [
      [
        "Picking speed and accuracy decide whether orders leave the same day and arrive complete. Mis-picks also corrupt inventory records: the wrong SKU leaves, and both counts go wrong. For many wholesale buyers, speed and reliability of delivery matter as much as price.",
      ],
    ],
    mistakes: [
      ["Keeping fast movers in far corners, which multiplies walking time."],
      ["Picking without scanning, so errors are found only by the customer."],
      ["Forecasting components without exploding kit sales into component demand."],
      ["Pre-building more kits than demand supports, locking up components."],
      ["Measuring order cycle time to the ship date and ignoring transit, or reporting the average and hiding late orders."],
    ],
    inApp: [
      "Supply Chain Manager does not manage picking, kitting or customer order cycle time. It reads outbound movement from your data to calculate demand, and its logistics score reflects inbound purchase order on-time delivery, not customer deliveries.",
    ],
    faq: [
      {
        q: "How do I choose a picking method?",
        a: ["Look at your order profile: lines per order and orders per day. Many small orders favor batch picking, a few large ones favor discrete, and many zones favor zone or wave."],
      },
      {
        q: "What is a good pick accuracy?",
        a: ["Aim as high as your process can support and track it by picker and zone. Every mis-pick also creates an inventory error, so the cost is more than the return."],
      },
    ],
    related: ["putaway", "cycle-counting", "warehouse-management-system", "fill-rate", "sku"],
    updated: U,
  },
  {
    slug: "third-party-logistics",
    term: "Third-Party Logistics (3PL)",
    short: "3PL",
    metaTitle: "3PL, Cross-Docking and LTL Freight Explained",
    category: "warehouse",
    definition:
      "A third-party logistics provider (3PL) runs warehousing or transport for you under contract. Cross-docking and LTL freight are two related ways to move goods.",
    explain: [
      [
        "Distributors use 3PLs to add a region without opening their own building, to handle seasonal peaks, or to outsource transport. You still own the stock and the planning; the 3PL handles the physical operation.",
      ],
      [
        "Contracts with 3PLs are typically priced per pallet stored, per order picked and per line or unit handled. Understanding which of those drives your bill helps decide which SKUs to hold there: slow, bulky items can cost more in storage than they earn.",
      ],
    ],
    sections: [
      {
        title: "Cross-docking: skipping storage",
        paragraphs: [
          [
            "Cross-docking moves inbound goods straight from receiving to outbound shipping, with little or no time in storage. Goods arrive already destined for specific customers or branches, are sorted on the dock and loaded onto outbound vehicles, often within hours. It needs tight coordination between inbound arrivals and outbound departures.",
          ],
          [
            "There are two forms. In pre-allocated cross-docking the supplier labels goods for their final destination before shipping, which is faster on the dock. In post-allocated cross-docking the distributor decides where each item goes once it arrives, which keeps flexibility to send stock where it is needed most that day. It cuts handling, storage and dock-to-stock time for goods already sold or allocated, but it fails without reliable advance shipping notices or for goods that still need inspection.",
          ],
        ],
      },
      {
        title: "LTL and full-truckload freight",
        paragraphs: [
          [
            "Less-than-truckload (LTL) freight is a shipment too small to fill a truck, carried alongside other shippers' goods and priced by weight, size and distance. It is cheaper than paying for a full truck (FTL) for a few pallets, but it usually takes longer because freight is consolidated and moved through carrier terminals, with more handling and more chance of damage.",
          ],
          [
            "LTL pricing usually depends on freight class, which reflects density, ease of handling and liability, as well as weight and distance. Light, bulky goods cost more for their weight than dense ones, and accurate weights and dimensions avoid re-classification charges. Freight is a meaningful part of landed cost, so order size and frequency decisions should account for the freight band they land in, not just unit price. Grouping two suppliers' orders into one collection, or ordering slightly more often in full loads, can move freight from LTL to cheaper per-pallet FTL rates.",
          ],
        ],
      },
      {
        title: "Which option, when",
        table: {
          head: ["Option", "Use when", "Main cost or risk"],
          rows: [
            ["3PL warehouse", "Testing a region or covering a peak", "Per-pallet and per-pick fees; stale stock data"],
            ["Cross-docking", "Goods are already sold or allocated", "Needs precise inbound and outbound timing"],
            ["LTL freight", "A few pallets to move", "Slower; more handling; class-based pricing"],
            ["Full truckload", "Enough volume to fill a truck", "Over-ordering to fill the load"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative: a distributor serves a new region from a 3PL warehouse holding its top 300 SKUs, replenished weekly from the main warehouse, before deciding whether demand justifies its own branch. For cross-docking: a central warehouse receives a full truck from a supplier, splits it on the dock into five branch deliveries and sends them out the same evening, with none of it put away. For freight: an order of 4 pallets goes LTL while an order of 22 pallets books a full truck.",
      ],
    ],
    why: [
      [
        "A 3PL turns fixed warehouse costs into variable ones, and cross-docking and freight choices decide how much of the landed cost goes to handling and transport. The planning challenge is the same as any extra location: deciding which SKUs to hold there and in what quantity.",
      ],
    ],
    mistakes: [
      ["Not getting daily stock data from the 3PL, so planning runs on stale numbers."],
      ["Holding the full range at a 3PL site when only fast movers sell there."],
      ["Cross-docking without reliable advance shipping notices, or for goods that need inspection or relabelling."],
      ["Ignoring freight class and density, which drive LTL pricing, or comparing supplier quotes without the inbound freight they imply."],
    ],
    inApp: [
      "Supply Chain Manager models every location as a warehouse, so a 3PL site whose stock you load can be planned like any of your own. It does not record 3PL fees, freight, LTL classes or cross-dock flows.",
    ],
    faq: [
      {
        q: "Who owns the stock at a 3PL?",
        a: ["Usually you do. The 3PL stores and handles it for a fee, so you remain responsible for planning and replenishment."],
      },
      {
        q: "When is cross-docking not appropriate?",
        a: ["When goods need inspection, relabelling or repacking, or when you cannot coordinate inbound and outbound timing closely."],
      },
    ],
    related: ["total-cost-of-ownership", "inventory-transfer", "warehouse-management-system", "cycle-stock", "economic-order-quantity"],
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
    sections: [
      {
        title: "What a WMS does day to day",
        bullets: [
          ["Receiving: checks arrivals against purchase orders or advance notices and records quantities and condition."],
          ["Putaway: tells the operator which location to use and records where stock went."],
          ["Picking and packing: directs pickers, confirms each scan and catches mis-picks before shipping."],
          ["Counting: schedules cycle counts and records adjustments with reasons."],
          ["Reporting: gives live stock by location, which planning tools can use."],
        ],
      },
      {
        title: "WMS versus ERP versus planning software",
        table: {
          head: ["System", "Main question it answers", "Typical data"],
          rows: [
            ["ERP or inventory system", "How much do we have, owe and owe us?", "Orders, invoices, stock totals"],
            ["WMS", "Where is it and what should staff do next?", "Locations, scans, tasks"],
            ["Planning software", "What should we buy and when?", "Demand history, lead times, stock"],
          ],
        },
      },
      {
        title: "Signs you may need a WMS",
        paragraphs: [
          [
            "Common signs are stock that cannot be found when it is physically in the building, frequent mis-picks, counts that always disagree with the system, and growth that has outstripped paper or spreadsheet processes. Before buying one, check whether your ERP already has warehouse features you are not using. Also plan the data feed: planning tools are only as good as the stock figures they receive, so decide how often warehouse data flows out and who checks it.",
          ],
          [
            "A WMS is a large project. Smaller distributors often get most of the benefit from fixing the basics first: consistent bin locations, scanning at receiving and picking, and a regular cycle count. When you do choose one, test it on your hardest real cases, such as split pallets, returns and partial deliveries, rather than on a clean demonstration.",
          ],
        ],
      },
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
      ["Buying a WMS before fixing basics such as bin locations and scanning."],
    ],
    inApp: [
      "Supply Chain Manager is not a WMS. It reads stock and movement data that your ERP or warehouse system exports (file import or an automatic refresh from a spreadsheet link) and turns it into reorder, stockout and supplier insights.",
    ],
    faq: [
      {
        q: "Do I need a WMS to use inventory planning software?",
        a: ["No. Planning software needs reasonably accurate stock and movement data, which can come from an ERP or even a spreadsheet export."],
      },
      {
        q: "What should a WMS send to planning software?",
        a: ["Current stock by SKU and warehouse, receipts and shipments by date, and any holds or adjustments. Daily is usually enough for replenishment planning, as long as someone checks that the file is complete."],
      },
      {
        q: "What is the difference between a WMS and an ERP?",
        a: ["An ERP runs the business transactions. A WMS runs the physical tasks in the warehouse and tracks locations."],
      },
    ],
    related: ["putaway", "order-picking", "cycle-counting", "lot-tracking", "inventory-shrinkage"],
    updated: U,
  },
  {
    slug: "cycle-counting",
    term: "Cycle Counting",
    short: "Cycle counting",
    metaTitle: "Cycle Counting, Stocktakes and Inventory Accuracy",
    category: "warehouse",
    definition:
      "Cycle counting checks stock accuracy by counting a few locations every day. A full stocktake counts everything at once. Accuracy is the result either way.",
    explain: [
      [
        "Cycle counting replaces or reduces the annual shutdown stocktake. Because counts are small and frequent, errors are found close to when they happened, when the cause is still traceable. Many teams count A items more often than C items.",
      ],
      [
        "Counts can be scheduled by class, by location (every aisle in turn) or triggered by events, such as a bin reaching zero or a picker reporting a shortage. Event-based counts are cheap because the bin is empty or nearly empty, which makes it quick to check whether the system agrees.",
      ],
    ],
    formula: ["Inventory Accuracy % = Counted SKU-locations that match ÷ SKU-locations counted × 100"],
    sections: [
      {
        title: "The physical inventory count (stocktake)",
        paragraphs: [
          [
            "A physical inventory count counts every item in a warehouse at one point in time, usually with operations paused. It is often required for year-end accounts. It gives a complete snapshot, but it is disruptive, prone to tired-counter errors and finds problems long after they happened.",
          ],
          [
            "Preparation decides how well it goes: tidy locations, completed receipts and shipments, count sheets or scanners, and blind counts where counters do not see the expected quantity. Recounting only the largest variances, rather than everything, keeps the process manageable. Many businesses use a strong cycle-counting program to shorten or replace the annual count, with agreement from their accountants.",
          ],
        ],
      },
      {
        title: "Inventory accuracy: how to measure it",
        paragraphs: [
          [
            "Inventory accuracy is how often the quantity in your system matches what is physically on the shelf, measured from counts. It is usually the share of counted SKU-locations whose system quantity matches the physical count, sometimes within a small tolerance. Value-based measures can hide errors because overs and unders cancel out.",
          ],
          [
            "A tolerance can be sensible for small, cheap items counted in large quantities, such as screws sold by weight. For high-value or serialized items, the standard should be an exact match. Tracking accuracy by zone or category shows where the process is breaking, which is more useful than one overall figure.",
          ],
        ],
      },
      {
        title: "A simple cycle-count schedule",
        table: {
          head: ["Class", "Count frequency", "Why"],
          rows: [
            ["A items", "Monthly", "Highest value and impact on service"],
            ["B items", "Quarterly", "Moderate value"],
            ["C items", "Twice a year", "Low value; simple checks suffice"],
            ["Any item", "When a bin hits zero or a picker reports a shortage", "Cheap, targeted, and catches errors immediately"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: a warehouse with 3,000 SKUs counts A items monthly, B items quarterly and C items twice a year, which works out to a few dozen counts a day, done in the quiet hour before afternoon picking. If 400 locations are counted and 372 match exactly, accuracy is 93%, and the other 28 are where the next stockout or false reorder will come from.",
      ],
    ],
    why: [
      [
        "Every replenishment number depends on on-hand stock being right. Poor accuracy causes both phantom stock (system says yes, shelf says no) and unnecessary reorders, and cycle counting keeps it right continuously instead of once a year.",
      ],
    ],
    mistakes: [
      ["Correcting the count without investigating why it was wrong."],
      ["Counting while stock is moving, which creates false variances."],
      ["Leaving receiving and shipping running during a full stocktake."],
      ["Measuring only total value, where errors cancel out, or allowing manual adjustments without a reason code."],
    ],
    inApp: [
      "Supply Chain Manager takes quantity on hand from your data and does not schedule counts or measure inventory accuracy. It assumes your imported quantities are right, so a recent count before an import improves every figure it shows.",
    ],
    faq: [
      {
        q: "Can cycle counting replace the annual stocktake?",
        a: ["Often, if your accountants accept the program's accuracy and controls. Agree this with them in advance."],
      },
      {
        q: "How many items should I count per day?",
        a: ["Enough to cover the schedule above. For a few thousand SKUs that is typically a few dozen locations a day."],
      },
    ],
    related: ["inventory-shrinkage", "quantity-on-hand", "abc-analysis", "warehouse-management-system", "putaway"],
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
    sections: [
      {
        title: "Where shrinkage comes from",
        table: {
          head: ["Source", "Typical sign", "Fix"],
          rows: [
            ["Receiving errors", "Short counts against the PO", "Count at the dock and record exceptions"],
            ["Picking errors", "Wrong SKU shipped; two SKUs off by opposite amounts", "Scan on pick; check accuracy by picker"],
            ["Damage", "Concentrated in one zone or handling step", "Fix racking, packaging or equipment"],
            ["Unrecorded returns", "System shows less than the shelf", "Receive returns the same day"],
            ["Theft", "Small, high-value items; repeated pattern", "Access control; counts of target items"],
            ["Expiry and spoilage", "Dated goods", "Pick in expiry order; smaller orders"],
          ],
        },
      },
      {
        title: "Keeping shrinkage out of your demand data",
        paragraphs: [
          [
            "If lost or damaged stock is booked as a sale, it inflates demand and therefore forecasts and reorder points. Book losses as adjustments with a reason code, and exclude them from the demand history. Separate recurring shrinkage on a SKU from one-off events too, because a SKU that loses 5% every month is telling you something about how it is handled.",
          ],
          [
            "Review the adjustment log monthly, not annually. A short, regular look at the biggest adjustments by value and by reason is usually enough to find the one or two processes causing most of the loss.",
          ],
          [
            "Watch for offsetting errors too. If one SKU is 12 units short and a similar SKU is 12 units over, the likely cause is a mis-pick rather than loss, and the fix is a recount of both, not a write-off of either. Netting these out before valuing the shrinkage gives a truer picture of what was really lost.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: records show $500,000 of stock; the count finds $492,500. Shrinkage is $7,500, or 1.5%. Tracing adjustments by reason may show most of it came from damage in one zone, which is a fixable problem rather than random loss.",
      ],
    ],
    why: [
      [
        "Shrinkage is lost margin. It also hides inside demand data if losses are booked as sales, which then inflates forecasts, and it erodes trust in the stock figures that every reorder decision uses.",
      ],
    ],
    mistakes: [
      ["Writing off shrinkage as a single annual number without reasons."],
      ["Booking lost or damaged stock as sales."],
      ["Correcting adjustments without finding the process that caused them."],
    ],
    inApp: [
      "Supply Chain Manager does not track shrinkage or adjustment reasons. If you import stock movements that include write-offs as outbound sales, they will be counted as demand, so keep adjustments separate in your data.",
    ],
    faq: [
      {
        q: "What is an acceptable shrinkage rate?",
        a: ["It varies widely by product and handling. Measure your own rate by reason code and aim to reduce the fixable causes first."],
      },
      {
        q: "How can I reduce shrinkage without a big project?",
        a: ["Start with the adjustment log. Group the last three months of adjustments by reason and location, find the one or two causes that account for most of the value, and fix those processes first, usually receiving counts, scanning on pick and same-day returns."],
      },
      {
        q: "Is shrinkage the same as a write-off?",
        a: ["Shrinkage is the loss itself. A write-off is the accounting entry that removes the value from your books."],
      },
    ],
    related: ["cycle-counting", "inventory-write-off", "quantity-on-hand", "warehouse-management-system", "lot-tracking"],
    updated: U,
  },
  {
    slug: "lot-tracking",
    term: "Lot Tracking (Batch Tracking)",
    short: "Lot tracking",
    metaTitle: "Lot Tracking, Serial Numbers and FEFO Explained",
    category: "warehouse",
    definition:
      "Lot tracking records which batch each unit came from, so recalls can be traced. Serial numbers track single units, and FEFO ships the earliest expiry first.",
    explain: [
      [
        "Lot tracking matters for regulated and perishable goods: food, chemicals, pharmaceuticals and many industrial products. If a supplier recalls a lot, you can find exactly where it went instead of recalling everything.",
      ],
      [
        "For it to work, the lot must be captured at every step: receiving, putaway, picking and shipping. A single step that skips the scan breaks the chain, and a recall then has to fall back on broad estimates. Barcode labels that carry the lot number make this practical without slowing the warehouse down.",
      ],
    ],
    sections: [
      {
        title: "Serialized inventory: tracking single units",
        paragraphs: [
          [
            "Serialized inventory tracks each unit by a unique serial number rather than only counting quantities. It is common for equipment, electronics and anything with a warranty. Where lot tracking follows a batch, serialization follows one unit: which supplier, when received, which customer and any returns.",
          ],
          [
            "Serial numbers are usually captured at receiving from a barcode on each unit, and again at shipping. That makes it possible to answer 'which customers received units from this batch?' or 'is this returned unit one we sold?'. Because it adds a scan at every movement, it is normally reserved for items that justify it, such as high-value or warranty-bearing products.",
          ],
        ],
      },
      {
        title: "FEFO: first expired, first out",
        paragraphs: [
          [
            "FEFO is a picking rule that ships the units with the earliest expiry date first, whatever order they arrived in. It is the standard for perishable and dated goods, and it differs from FIFO when a later delivery has a shorter shelf life than stock already on hand. FEFO needs lot or expiry dates recorded at receiving and visible at the point of picking, on a scanned label or in the system.",
          ],
          [
            "It also changes replenishment: if typical shelf life on arrival is short, order quantities need to be small enough to sell well before expiry, even if a larger order earns a better price. For food, chemicals or adhesives, expired stock is a write-off, and many customers require a minimum remaining shelf life on delivery.",
          ],
        ],
      },
      {
        title: "Lot, serial or neither?",
        table: {
          head: ["Method", "Tracks", "Use for"],
          rows: [
            ["Lot / batch", "A group of units made together", "Perishable, regulated or recall-prone goods"],
            ["Serial number", "One individual unit", "Equipment, electronics, warranty items"],
            ["Neither", "Quantity only", "Low-risk, low-value, fast-turning goods"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative: a supplier recalls lot 23-118 of a sealant. With lot tracking, the distributor finds 140 units still in stock and 6 customers who received the rest, and contacts only them. For FEFO: lot A arrived first with expiry in March; lot B arrived a week later with expiry in February. FIFO ships lot A first; FEFO ships lot B first, so less stock expires on the shelf. For serials: a customer returns a controller under warranty, and the serial shows it shipped 14 months ago from a lot with a known defect.",
      ],
    ],
    why: [
      [
        "Lot tracking limits the cost of a recall and is often required by customers or regulators. Serial numbers support warranties, returns and theft prevention, and FEFO keeps waste down for dated goods.",
      ],
    ],
    mistakes: [
      ["Recording lots at receiving but not at picking, which breaks the trace."],
      ["Mixing lots in the same bin without recording them."],
      ["Serializing low-value items where the scanning cost outweighs the benefit, or letting units move without scanning the serial number."],
      ["Not recording expiry dates at receiving, or ordering quantities that cannot sell before expiry at the current pace."],
    ],
    inApp: [
      "Supply Chain Manager does not track lots, serial numbers or expiry dates. It plans on SKU quantities per warehouse, so for dated goods, watch expiry in your warehouse system and keep order quantities small enough to sell in time.",
    ],
    faq: [
      {
        q: "Do I need lot tracking?",
        a: ["If you sell food, chemicals, pharmaceuticals or other recall-prone goods, or your customers or regulators require traceability, yes. Otherwise it may not justify the scanning effort."],
      },
      {
        q: "What is the difference between FIFO and FEFO?",
        a: ["FIFO ships the oldest arrival first. FEFO ships the earliest expiry first, which is the safer rule for perishable goods."],
      },
    ],
    related: ["warehouse-management-system", "fifo", "inventory-write-off", "cycle-counting", "putaway"],
    updated: U,
  },
];
