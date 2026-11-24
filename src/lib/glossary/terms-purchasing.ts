import { g, guide, type GlossaryTerm } from "./types";

const U = "2026-11-24";

/**
 * Purchasing terms, consolidated from 19 pages to 8 fuller ones plus
 * payment-terms (merged into the finance cluster in the next batch). Removed
 * slugs are redirected in merged.ts. Product statements (`inApp`) were
 * checked against src/lib/metrics/*, prisma/schema.prisma and the purchase
 * order actions on 2026-11-24.
 */
export const PURCHASING_TERMS: GlossaryTerm[] = [
  {
    slug: "purchase-order",
    term: "Purchase Order (PO)",
    short: "Purchase order",
    metaTitle: "Purchase Order: Definition, Types and Cycle Time",
    category: "purchasing",
    definition:
      "A purchase order (PO) is the buyer's formal order to a supplier listing items, quantities, prices, dates and terms. Requisitions and blanket POs are variants.",
    explain: [
      [
        "Once the supplier accepts it, a PO is a commitment on both sides. It is also the record that later checks run against: what arrived at receipt and what was billed on the invoice.",
      ],
      [
        "For planning, an open PO is supply on the way. It belongs in inventory position from the day it is placed until the goods are received or the order is cancelled, unless its expected date has passed with no sign of delivery.",
      ],
    ],
    sections: [
      {
        title: "Purchase requisition: the request before the order",
        paragraphs: [
          [
            "A purchase requisition is an internal request to buy something, reviewed and approved before it becomes a purchase order. The requisition records the need; the PO records the commitment. Splitting the two lets a business control spending without everyone needing the authority to place orders.",
          ],
          [
            "Requisitions are most useful for spending that no automatic rule covers: equipment, services, new products or one-off purchases. For routine stock replenishment a requisition step mostly adds delay, so many distributors reserve it for non-stock purchases and let approved reorder rules raise stock POs directly.",
          ],
        ],
      },
      {
        title: "Blanket purchase order: one agreement, many releases",
        paragraphs: [
          [
            "A blanket purchase order is a longer-term agreement covering repeated purchases from one supplier, with deliveries released against it over time. It typically fixes prices and terms, and sometimes a total quantity or spend, for a period such as a year. Individual deliveries are called off with releases instead of a full PO each time.",
          ],
          [
            "Blankets work best when demand is steady enough that the total commitment is low risk and the supplier gives something in return: fixed prices, priority allocation or a shorter lead time on each release. Size each release from current demand, not a fixed monthly quantity agreed at the start, and track how much of the blanket has been released.",
          ],
        ],
      },
      {
        title: "PO cycle time: how long orders really take",
        paragraphs: [
          [
            "Purchase order cycle time is how long purchase orders actually take from the day they are placed to the day the goods are received. It is measured lead time. Comparing it with the supplier's quoted lead time shows whether your planning assumptions hold, and including the time before the PO is sent, from need to approval, shows how much delay is internal.",
          ],
          [
            "Measure it per supplier and, for important suppliers, per product family. A supplier can be fast on stocked items and slow on items made to order, and planning one lead time for everything they supply hides that difference. A rising cycle time is often the first visible sign of a supplier struggling.",
          ],
        ],
        formula: ["PO Cycle Time (days) = average of (Received Date − Order Date) across received POs"],
      },
      {
        title: "Which document for which job",
        table: {
          head: ["Document", "Records", "Typical use"],
          rows: [
            ["Purchase requisition", "An internal need and approval", "Non-stock and one-off purchases"],
            ["Purchase order", "The commitment to a supplier", "Every stock and non-stock purchase"],
            ["Blanket purchase order", "A period agreement with releases", "Steady, high-volume items with fixed prices"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative: PO 10482 to a supplier for 480 units of SKU ELC-2006 at $4.10, expected in 8 days, net 30 payment terms, delivering to the central warehouse. For cycle time, five POs that took 9, 12, 14, 11 and 13 days average 11.8 days against a quoted 10, so planning on 10 days leaves almost two days uncovered on every order. For a blanket: 12,000 units of packaging over 12 months at a fixed price, with monthly releases of about 1,000 units adjusted to actual demand.",
      ],
    ],
    why: [
      [
        "Clean PO data, especially order date, expected date and received date, is what makes supplier on-time performance, cycle time and price variance measurable at all. Cycle time also feeds safety stock and reorder points directly.",
      ],
    ],
    mistakes: [
      ["Leaving the expected date blank, so lateness can never be measured."],
      ["Not closing short-shipped or cancelled POs, which keeps phantom supply in the plan."],
      ["Ordering by phone or email with no PO, so nothing can be matched later."],
      ["Routing every stock reorder through manual approval, which adds days to the lead time."],
      ["Committing to a blanket quantity based on an optimistic forecast, or losing track of how much has been released."],
    ],
    inApp: [
      "Supply Chain Manager can create a purchase order record from a reorder suggestion once a supplier, quantity and unit price are filled in, and it tracks each order's order, expected and received dates. The record is saved in the app; it is not sent to the supplier. It reports average PO cycle time on the Procurement page. It does not model requisitions, blanket orders or partial receipts.",
    ],
    faq: [
      {
        q: "What should a purchase order contain?",
        a: ["A PO number, the supplier, the items and quantities, agreed prices, the expected delivery date and delivery location, and payment terms."],
      },
      {
        q: "What is the difference between a PO and an invoice?",
        a: ["The PO is the buyer's order. The invoice is the supplier's bill. Matching the two with the goods receipt is called a three-way match."],
      },
    ],
    related: ["three-way-match", "on-time-delivery-rate", "lead-time", "total-cost-of-ownership", "request-for-quote"],
    updated: U,
  },
  {
    slug: "three-way-match",
    term: "Three-Way Match",
    short: "Three-way match",
    metaTitle: "Three-Way Match, Goods Receipt and ASN Explained",
    category: "purchasing",
    definition:
      "Three-way match checks that a supplier invoice agrees with the purchase order and the goods receipt before payment. Goods receipts and ASNs feed it.",
    explain: [
      [
        "The PO says what was ordered and at what price. The goods receipt says what actually arrived. The invoice says what the supplier is billing. If all three agree within tolerance, the invoice is paid; if not, it is held for review.",
      ],
      [
        "Tolerances are normally set as a percentage or an amount, so tiny rounding differences do not stop payment. Matches that fail usually go to purchasing to resolve with the supplier, and tracking which suppliers fail most often is a useful extra input into supplier reviews.",
      ],
    ],
    sections: [
      {
        title: "Goods receipt: the second document",
        paragraphs: [
          [
            "A goods receipt records stock arriving from a supplier: what came in, how many units, in what condition and against which purchase order. It is the moment purchased stock becomes on-hand inventory. The received date it records is also what supplier on-time performance is measured against.",
          ],
          [
            "Receiving is where many data problems start. Counting and recording what actually arrived, by SKU and unit of measure, protects every later number: on-hand stock, supplier performance, the three-way match and the next reorder. Recording receipts days after the goods arrived makes suppliers look late, and goods left unreceived on the dock are invisible to sales and planning.",
          ],
        ],
      },
      {
        title: "Advance shipping notice: warning before the truck",
        paragraphs: [
          [
            "An advance shipping notice (ASN) is a supplier's message, sent when goods ship, listing what is on the way, in what quantities and when it should arrive. It turns 'the PO is open' into 'these 480 units shipped today and arrive Thursday'. It lets the warehouse plan receiving labor and lets purchasing spot short shipments before the truck arrives.",
          ],
          [
            "ASNs are usually sent by EDI or through a supplier portal, but even an emailed packing list sent at dispatch gives most of the benefit. The point is timing: the notice arrives before the goods do. Asking key suppliers for one is often a quick win, because it costs them little and gives you days of warning about short or split shipments. Do not receive against the ASN without checking the physical goods.",
          ],
        ],
      },
      {
        title: "What a failed match looks like",
        table: {
          head: ["PO", "Receipt", "Invoice", "Result"],
          rows: [
            ["500 at $4.00", "500", "500 at $4.00", "Match: pay"],
            ["500 at $4.00", "480", "500 at $4.00", "Quantity mismatch: pay for 480 only"],
            ["500 at $4.00", "500", "500 at $4.20", "Price mismatch: hold for purchasing"],
            ["500 at $4.00", "480", "500 at $4.20", "Both: hold and resolve"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: PO for 500 units at $4.00. Receipt shows 480 units. Invoice bills 500 at $4.20. The match fails on both quantity and price, so the invoice is held, saving $164 that would otherwise be overpaid (500 × $4.20 − 480 × $4.00). For a delivery against PO 10482 arriving with 480 units, 6 damaged: the receipt records 474 good units into stock and 6 to a returns location, and the PO stays open for the shortfall or is closed short.",
      ],
    ],
    why: [
      [
        "Short shipments and price creep are common and easy to miss at volume. Three-way match catches them before payment rather than months later, and accurate, prompt receipts keep inventory data and supplier scorecards honest.",
      ],
    ],
    mistakes: [
      ["Setting tolerances so wide that real discrepancies pass."],
      ["Receiving goods without recording quantities, which makes the match impossible."],
      ["Receiving the full PO quantity without counting, or recording receipts days after arrival."],
      ["Receiving against the ASN without checking the physical goods, or planning from the original PO and ignoring ASN quantities."],
    ],
    inApp: [
      "Supply Chain Manager records a received date on each purchase order. It does not store received quantities, goods receipts, ASNs or supplier invoices, so it cannot perform a three-way match or detect short shipments. Do the match in your accounting or ERP system.",
    ],
    faq: [
      {
        q: "What is the difference between two-way and three-way match?",
        a: ["Two-way match compares the invoice with the PO. Three-way adds the goods receipt, so you pay only for what actually arrived."],
      },
      {
        q: "Who sets the tolerance?",
        a: ["Finance and purchasing together, usually as a small percentage or amount per line. Review it if too many invoices are held or too many errors pass."],
      },
    ],
    related: ["purchase-order", "on-time-delivery-rate", "total-cost-of-ownership", "payment-terms", "putaway"],
    updated: U,
  },
  {
    slug: "on-time-delivery-rate",
    term: "On-Time Delivery Rate (OTD)",
    short: "OTD",
    metaTitle: "On-Time Delivery Rate and Expediting: Formula & Example",
    category: "purchasing",
    definition:
      "On-time delivery rate (OTD) is the share of orders that arrived on or before the promised date. Expediting is the costly recovery when they do not.",
    explain: [
      [
        "OTD is the timing half of OTIF (on time in full). It is useful on its own for spotting late suppliers, but a supplier can score well on OTD while regularly shipping short, which only OTIF catches. See the ",
        guide("supplier-otif", "supplier OTIF guide"),
        " for the combined measure.",
      ],
      [
        "Agreeing what 'on time' means matters. Some businesses allow a grace window of a day or two; others count any delivery after the expected date as late. Either can work, but apply the definition the same way to every supplier, or the comparison is meaningless.",
      ],
    ],
    formula: ["OTD % = Orders received on or before expected date ÷ Orders received × 100"],
    sections: [
      {
        title: "Expediting: speeding up an order already placed",
        paragraphs: [
          [
            "Expediting is speeding up an order that is already placed, by pushing the supplier, paying for faster shipping or splitting the delivery, to avoid a stockout. It is a recovery tool, not a plan. Every expedite costs something: premium freight, supplier goodwill or a planner's afternoon. Frequent expediting usually points to reorder points that are too low or lead times that are wrong.",
          ],
          [
            "Knowing the cost of each option lets purchasing make the cheapest call quickly instead of defaulting to the most expensive: expedite, transfer stock from another warehouse, or accept the backorder. Track expedite costs, or the underlying planning problem is never fixed. See the ",
            guide("reorder-expedite-or-transfer", "reorder, expedite or transfer guide"),
            ".",
          ],
        ],
      },
      {
        title: "Using OTD well",
        bullets: [
          ["Measure against your receipt date, not the supplier's ship date."],
          ["Include open orders that are already overdue, or the slowest suppliers look better than they are."],
          ["Trend it weekly by supplier; a slipping supplier shows up before it causes a stockout."],
          ["Pair it with a measure of quantity accuracy, because late is only one way to fail."],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: 40 POs received last quarter, 34 on or before the expected date. OTD = 85%. If 6 of those 34 were short-shipped, OTIF would be 70%. For expediting: a SKU will run out in 4 days and the PO is due in 8. Air freight for part of the order costs $350 extra. If the stockout would lose about $1,200 of margin, the expedite is worth it; if another warehouse can transfer stock for $80, that is better still.",
      ],
    ],
    why: [
      [
        "OTD shows which suppliers' dates you can plan on and trending it weekly shows whether a supplier is slipping before it becomes a stockout. Comparing the cost of expediting with the cost of fixing the plan shows when habit is quietly draining margin.",
      ],
    ],
    mistakes: [
      ["Counting the supplier's ship date instead of your receipt date."],
      ["Reporting OTD without a quantity measure and missing short shipments."],
      ["Expediting by habit rather than comparing it with a transfer."],
      ["Never tracking expedite costs, so the underlying planning problem is never fixed."],
    ],
    inApp: [
      "Supply Chain Manager charts the weekly share of purchase orders that arrived by their expected date and counts open orders already past their expected date. Its supplier scores are labelled OTIF, but the app does not record received quantities, so every received order counts as in full and the score measures timeliness only.",
    ],
    faq: [
      {
        q: "What is a good on-time delivery rate?",
        a: ["There is no universal figure. Compare suppliers with each other and with your own trend, and decide the rate below which you add buffer stock or look for another source."],
      },
      {
        q: "What is the difference between OTD and OTIF?",
        a: ["OTD checks only timing. OTIF also requires the full quantity, so it is always equal to or lower than OTD."],
      },
    ],
    related: ["lead-time", "purchase-order", "inventory-transfer", "stockout", "dual-sourcing"],
    guides: ["supplier-otif", "reorder-expedite-or-transfer"],
    updated: U,
  },
  {
    slug: "dual-sourcing",
    term: "Dual Sourcing",
    short: "Dual sourcing",
    category: "purchasing",
    definition:
      "Dual sourcing means buying the same item from two suppliers instead of one, to reduce the risk of a single supplier failing or running late.",
    explain: [
      [
        "Single sourcing concentrates volume, which can win better prices and simpler relationships. Dual sourcing trades some of that for resilience, and gives you a benchmark to keep both suppliers honest on price and lead time.",
      ],
      [
        "Qualifying a second source takes time and often costs some volume discount, so it is usually reserved for items where a supply failure would be expensive: high-volume A items, items with long import lead times, or products from a single region. For many C items, a single reliable supplier and a little extra safety stock are enough.",
      ],
    ],
    sections: [
      {
        title: "Dual sourcing or more safety stock?",
        paragraphs: [
          [
            "Both cost money, so compare them. A second source costs qualification time and a smaller discount on each supplier's volume. Extra safety stock costs carrying cost every day it sits. For A-class items with long or variable lead times, a qualified second source is often cheaper insurance than holding weeks of extra stock, while for slow C items the buffer is usually cheaper than the effort of a second supplier.",
          ],
          [
            "Use measured data to decide. Look at each supplier's lead time and on-time record (see ",
            g("lead-time", "lead time variability"),
            ") and at what a stockout on the item would cost. If a single supplier's late deliveries are driving safety stock up, the second source may pay for itself.",
          ],
        ],
        table: {
          head: ["Situation", "Better fit"],
          rows: [
            ["High-value A item, long or variable lead time", "Dual source"],
            ["Single-region or single-factory product", "Dual source if possible"],
            ["Slow C item with a reliable supplier", "Single source plus a small buffer"],
            ["Specialist part only one maker produces", "Single source plus a larger buffer"],
          ],
        },
      },
      {
        title: "Making a second source work",
        bullets: [
          ["Check that the two parts are truly interchangeable by specification, not only by name."],
          ["Split volume unevenly enough that your main supplier still treats you as important, for example 70/30."],
          ["Run a small order through the second source regularly so it is proven before you need it."],
          ["Compare both suppliers on landed cost and lead time, not unit price alone."],
        ],
      },
    ],
    example: [
      [
        "Illustrative: a distributor buys 70% of a key cable from its main supplier and 30% from a second. When the main supplier's lead time doubles during a shortage, the second can absorb more volume within weeks.",
      ],
    ],
    why: [
      [
        "For A-class items with long or variable lead times, a qualified second source is often cheaper insurance than holding weeks of extra safety stock. It also gives you a live price and lead time comparison.",
      ],
    ],
    mistakes: [
      ["Splitting volume so evenly that neither supplier sees you as important."],
      ["Treating two parts as interchangeable without checking specifications."],
      ["Qualifying a second source for items where a buffer would be cheaper."],
    ],
    inApp: [
      "Supply Chain Manager assigns one supplier to each product, so it plans and scores a SKU against a single supplier. It does not model split volumes or a second source.",
    ],
    faq: [
      {
        q: "When is dual sourcing worth it?",
        a: ["When a supply failure would be expensive and the item has a long or variable lead time. For slow, low-value items it is rarely worth the effort."],
      },
      {
        q: "How do I qualify a second supplier?",
        a: ["Request samples, check specifications and certifications against the first source, place a trial order, and compare the delivered quality, lead time and landed cost before giving them regular volume."],
      },
      {
        q: "Does dual sourcing always cost more?",
        a: ["Often a little, through smaller volume discounts. It can also lower cost by giving you a credible alternative in price negotiations."],
      },
    ],
    related: ["on-time-delivery-rate", "total-cost-of-ownership", "request-for-quote", "service-level", "lead-time"],
    updated: U,
  },
  {
    slug: "request-for-quote",
    term: "Request for Quote (RFQ)",
    short: "RFQ",
    metaTitle: "Request for Quote (RFQ) and Spend Analysis Explained",
    category: "purchasing",
    definition:
      "A request for quote (RFQ) asks several suppliers to price the same list of items so offers compare side by side. Spend analysis shows where to run one.",
    explain: [
      [
        "A good RFQ fixes everything except price: specifications, volumes, delivery locations, lead times and payment terms. Otherwise offers are not comparable, and the cheapest unit price may hide longer lead times or worse terms.",
      ],
      [
        "Sharing realistic volumes improves the quality of quotes. Suppliers price risk, so vague or inflated volumes either lead to padded prices or to commitments you cannot meet. Including recent purchase history by SKU gives suppliers a clear basis to price from.",
      ],
    ],
    sections: [
      {
        title: "Spend analysis: knowing where to ask",
        paragraphs: [
          [
            "Spend analysis groups past purchases by supplier, category and SKU to show where money goes and where better prices or terms are possible. It usually starts from purchase order or invoice data. The first view is often a surprise: spend spread across more suppliers than anyone realized, or one category growing much faster than sales.",
          ],
          [
            "Clean data is most of the work. Standardizing supplier names, grouping items into categories and separating stock purchases from expenses usually takes longer than the analysis itself. Once done, the same structure can be refreshed every quarter. Negotiating power comes from knowing your volume, and spend analysis also shows which suppliers deserve the most attention in performance reviews.",
          ],
        ],
      },
      {
        title: "Running an RFQ step by step",
        bullets: [
          ["Pick the categories with the most spend, using the spend analysis and the ABC ranking."],
          ["Define specs, annual volumes by SKU, delivery locations, required lead times and payment terms."],
          ["Send the same package to three or more suppliers, including your current one."],
          ["Compare total cost, not only unit price: lead time, MOQ, freight and terms all change the real cost."],
          ["Decide in advance whether you will switch, split or only use the quotes to renegotiate."],
        ],
      },
      {
        title: "What to compare in the replies",
        table: {
          head: ["Item", "Why it matters"],
          rows: [
            ["Unit price at your volumes", "The headline, but only one part of cost"],
            ["Lead time and its reliability", "Drives safety stock and stockout risk"],
            ["MOQ and pack size", "Drives how much stock you must buy"],
            ["Freight and duties", "Belongs in landed cost"],
            ["Payment terms", "Affects cash tied up"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative: an RFQ for 40 fastener SKUs with annual volumes, required lead times and delivery to two warehouses. Supplier A is 4% cheaper, but supplier B quotes half the lead time, which could cut safety stock by more than the price difference. For spend analysis: a review shows the same packaging bought from five suppliers at prices ranging over 20%; consolidating to two suppliers with a blanket order cuts the average price and simplifies ordering.",
      ],
    ],
    why: [
      [
        "Regular RFQs on high-spend categories keep prices current and surface alternative suppliers before you need them. Spend analysis tells you which categories justify the effort.",
      ],
    ],
    mistakes: [
      ["Comparing unit prices only, without lead time, MOQ, freight and terms."],
      ["Running an RFQ with no real intention to switch, which wears out supplier goodwill."],
      ["Analyzing invoices with inconsistent supplier names, which splits the same supplier into many."],
      ["Looking only at spend, not at the lead time and reliability bought with it."],
    ],
    inApp: [
      "Supply Chain Manager does not run RFQs. Its Procurement page shows purchase order spend and supplier price variance from your imported orders, which is a starting point for a spend review.",
    ],
    faq: [
      {
        q: "How many suppliers should I send an RFQ to?",
        a: ["Three to five is typical: enough to compare, few enough that each takes the request seriously."],
      },
      {
        q: "How often should I run RFQs?",
        a: ["For high-spend categories, annually or when prices move. For minor categories, less often."],
      },
    ],
    related: ["total-cost-of-ownership", "dual-sourcing", "purchase-order", "abc-analysis", "economic-order-quantity"],
    updated: U,
  },
  {
    slug: "total-cost-of-ownership",
    term: "Total Cost of Ownership (TCO)",
    short: "TCO",
    metaTitle: "Total Cost of Ownership, Landed Cost and Price Variance",
    category: "purchasing",
    definition:
      "Total cost of ownership (TCO) is every cost of buying from a supplier, not just price. Landed cost and purchase price variance are two of its parts.",
    explain: [
      [
        "The cheapest unit price is often not the cheapest supplier. A longer, less reliable lead time means more safety stock; poor quality means returns and rework; small MOQs or better terms save cash. TCO puts them on one scale.",
      ],
    ],
    formula: ["TCO = Purchase price + Freight & duties + Inventory carrying cost + Quality & returns cost + Ordering & admin cost"],
    sections: [
      {
        title: "Landed cost: price plus getting it to your door",
        paragraphs: [
          [
            "Landed cost is the full cost of getting a product into your warehouse: purchase price plus freight, insurance, duties, taxes, brokerage and handling. For imported goods the extras can be a large share of the unit price, so margins, pricing and supplier comparisons are only accurate when they use landed cost.",
          ],
          [
            "Freight and duty can be allocated by units, weight, volume or value. The right basis depends on what drives the cost: freight usually follows weight or volume, duty usually follows value. A single per-unit allocation for a mixed container can make small, light items look more expensive than they are and heavy items cheaper. See also ",
            g("incoterms", "Incoterms"),
            ", which decide which of these costs the seller already includes.",
          ],
        ],
        formula: ["Landed Cost per Unit = (Purchase cost + Freight + Insurance + Duties & taxes + Brokerage + Handling) ÷ Units received"],
      },
      {
        title: "Purchase price variance: paid versus planned",
        paragraphs: [
          [
            "Purchase price variance (PPV) is the difference between the price actually paid and a standard or expected cost. A positive variance means you paid more than planned, which erodes margin if selling prices do not move. Tracked per supplier and SKU, it shows where price increases are creeping in and which suppliers hold their prices.",
          ],
          [
            "A negative variance is not automatically good news. It can come from buying larger quantities than needed to earn a discount, which raises carrying cost, or from a cheaper but less reliable supplier. Review variances alongside quantity and supplier performance, and keep standard costs up to date, or every variance looks large or small for the wrong reason.",
          ],
        ],
        formula: [
          "Price Variance % = (Price Paid − Standard Cost) ÷ Standard Cost × 100",
          "Variance Value = (Price Paid − Standard Cost) × Quantity",
        ],
      },
      {
        title: "What belongs in TCO",
        table: {
          head: ["Cost", "Driven by", "Often missed because"],
          rows: [
            ["Purchase price", "Quote and quantity breaks", "It is on the price list"],
            ["Freight, duties, insurance", "Origin, weight, Incoterm", "It arrives on separate invoices"],
            ["Inventory carrying cost", "Lead time and order size", "It never appears as an invoice line"],
            ["Quality and returns", "Supplier quality", "It is spread across claims and rework time"],
            ["Ordering and admin", "Number of orders and suppliers", "It is staff time"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: supplier A is $10.00 a unit with a 30-day lead time; supplier B is $10.40 with 7 days. At 1,000 units a month, A's extra lead time means holding roughly 770 more units in transit and buffer. At a 25% carrying rate that is about $1,900 a year, against $4,800 a year more paid to B. A still wins on cost, but by much less than the price gap suggests. For landed cost: 2,000 units at $5.00 ($10,000) plus $1,400 freight, $100 insurance, $600 duty and $200 brokerage is $12,300, or $6.15 a unit, 23% above the supplier price. For variance: standard cost $4.00, paid $4.30 on 2,000 units is +7.5%, or $600 more than planned.",
      ],
    ],
    why: [
      [
        "TCO keeps supplier choices from being made on unit price alone, which is how many distributors end up with long, unreliable supply chains for small savings. Landed cost changes which supplier is really cheapest, especially between domestic and imported options, and variance tracking shows price creep before it eats the margin.",
      ],
    ],
    mistakes: [
      ["Comparing suppliers on price per unit only."],
      ["Ignoring the safety stock a long lead time forces you to hold."],
      ["Pricing from the supplier's price list instead of landed cost, or spreading freight evenly by unit when products differ greatly in weight or volume."],
      ["Leaving standard costs out of date, so every variance looks large or small."],
    ],
    inApp: [
      "Supply Chain Manager calculates price variance for each purchase order line against the product's baseline unit cost and includes price stability in its procurement health score. It does not calculate landed cost or total cost of ownership, so enter freight and duty in your unit cost if you want variance to reflect them.",
    ],
    faq: [
      {
        q: "How do I estimate carrying cost for a TCO comparison?",
        a: ["Use your own annual carrying rate (capital, storage, insurance, shrinkage, obsolescence) applied to the average value of the extra stock a supplier's lead time forces you to hold."],
      },
      {
        q: "What is the difference between landed cost and TCO?",
        a: ["Landed cost covers price plus getting the goods to your door. TCO also includes inventory, quality and administration costs of using that supplier."],
      },
    ],
    related: ["request-for-quote", "dual-sourcing", "incoterms", "economic-order-quantity", "cash-to-cash-cycle"],
    updated: U,
  },
  {
    slug: "drop-shipment",
    term: "Drop Shipment",
    short: "Drop shipment",
    metaTitle: "Drop Shipment and Back-to-Back Orders: Definition",
    category: "purchasing",
    definition:
      "A drop shipment has the supplier ship directly to your customer. A back-to-back order is bought only once a customer has ordered it.",
    explain: [
      [
        "With a drop shipment you still sell to the customer and buy from the supplier, but you skip receiving, storage and picking. It suits bulky, slow-moving or made-to-order items you would not want to stock.",
      ],
      [
        "Drop-ship orders still need tracking: the supplier's dispatch confirmation and delivery proof should come back to you, because the customer will call you, not the supplier, if something goes wrong. Many distributors keep a short list of reliable drop-ship partners and use them only for lines where that reliability is proven.",
      ],
    ],
    sections: [
      {
        title: "Back-to-back orders (special orders)",
        paragraphs: [
          [
            "A back-to-back order is a purchase order raised only when a specific customer order arrives, so the item is bought for that customer rather than for stock. The goods may come into your warehouse and go straight out, or be drop shipped. Either way there is no stock risk: you buy only what is already sold.",
          ],
          [
            "The trade-off is lead time. A customer who could have had the item today from stock now waits for the supplier's lead time plus your handling. That is usually acceptable for unusual items, and it is honest to tell customers which lines are stocked and which are ordered in, so they can plan. Keep the link between the customer order and the purchase order, so the goods are reserved on arrival.",
          ],
        ],
      },
      {
        title: "Stock, back-to-back or drop ship?",
        table: {
          head: ["Method", "Who holds stock", "Best for", "Main risk"],
          rows: [
            ["Stocked", "You", "Fast and regular sellers", "Cash tied up; obsolescence"],
            ["Back-to-back", "Nobody for long; goods pass through you", "Rare items with a known buyer", "Customer waits for the lead time"],
            ["Drop ship", "The supplier", "Bulky, slow or made-to-order items", "Less control over delivery and packaging"],
          ],
        },
      },
      {
        title: "Keeping special orders out of your stock data",
        bullets: [
          ["Do not count drop-ship sales in warehouse demand, or the stock forecast inflates for items you never hold."],
          ["Do not stock an item just because it sells through occasional special orders."],
          ["Confirm the supplier's lead time before promising a delivery date."],
        ],
      },
    ],
    example: [
      [
        "Illustrative: a customer orders a large industrial cabinet you sell twice a year. Rather than stocking it, you raise a PO with the manufacturer, who delivers straight to the customer's site. For a back-to-back order: a contractor orders 40 units of a light fitting you do not stock, so you raise a PO for exactly 40 with a 5-day lead time and promise delivery in 7 days.",
      ],
    ],
    why: [
      [
        "Moving rarely sold SKUs to back-to-back ordering or drop shipping is one of the cleanest ways to cut slow-moving stock while still serving the customers who need them. It lets a distributor offer a wider range without holding the inventory.",
      ],
    ],
    mistakes: [
      ["Counting drop-ship sales in warehouse demand, which inflates stock forecasts."],
      ["Promising delivery dates without confirming the supplier's lead time."],
      ["Stocking items that sell only through occasional special orders."],
      ["Losing the link between the customer order and the PO, so the goods are not reserved on arrival."],
    ],
    inApp: [
      "Supply Chain Manager plans stock from outbound movement in your data. It does not distinguish drop-ship or special orders, so remove those lines from your imported movements if you do not hold the stock.",
    ],
    faq: [
      {
        q: "Who is responsible if a drop-shipped order arrives damaged?",
        a: ["Normally you, as the seller to the customer. Agree claim handling with the supplier before using them for drop shipping."],
      },
      {
        q: "Is a back-to-back order the same as a drop shipment?",
        a: ["No. Back-to-back is about timing: you buy only after the sale. Drop shipment is about delivery: the supplier ships straight to your customer. They are often combined."],
      },
    ],
    related: ["purchase-order", "abc-analysis", "on-time-delivery-rate", "lead-time", "incoterms"],
    updated: U,
  },
  {
    slug: "incoterms",
    term: "Incoterms",
    short: "Incoterms",
    category: "purchasing",
    definition:
      "Incoterms are standard trade rules from the International Chamber of Commerce that set who pays for and carries the risk of shipping at each stage.",
    explain: [
      [
        "The current edition, Incoterms 2020, has 11 rules. Seven apply to any transport mode: EXW (ex works), FCA, CPT, CIP, DAP, DPU and DDP (delivered duty paid). Four apply only to sea and inland waterway transport: FAS, FOB (free on board), CFR and CIF.",
      ],
      [
        "The rule chosen moves cost and risk between buyer and seller. Under EXW the buyer handles almost everything from the seller's premises; under DDP the seller delivers to the buyer with duties paid. Incoterms deal with delivery, costs and risk, not with ownership of the goods or payment, which your contract and payment terms cover.",
      ],
    ],
    sections: [
      {
        title: "How the rules move cost and risk",
        table: {
          head: ["Rule", "Group", "In plain terms"],
          rows: [
            ["EXW (ex works)", "Any mode", "Buyer collects at the seller's premises and bears nearly all cost and risk"],
            ["FCA (free carrier)", "Any mode", "Seller delivers to the buyer's carrier at an agreed place"],
            ["FOB (free on board)", "Sea only", "Seller loads on the ship at the origin port; buyer takes over from there"],
            ["CIF (cost, insurance, freight)", "Sea only", "Seller pays freight and minimum insurance to the destination port; risk passes earlier, at loading"],
            ["DAP (delivered at place)", "Any mode", "Seller delivers to the named place, ready to unload; buyer pays import duty"],
            ["DDP (delivered duty paid)", "Any mode", "Seller delivers to the buyer with import duties paid"],
          ],
        },
      },
      {
        title: "Using Incoterms when you compare quotes",
        paragraphs: [
          [
            "Two quotes on different Incoterms are not comparable until each is converted to landed cost. A low FOB price still needs ocean freight, insurance, duties and local delivery added, while a higher DDP price may already include them. Ask every supplier to quote on the same rule, or add the missing costs yourself before comparing.",
          ],
          [
            "Check the rule fits the transport. FOB is for goods loaded on a ship; for containers handed to a carrier before loading, FCA is often a better fit, so check with your freight forwarder. Always state the named place with the rule (for example FCA Shenzhen) and the edition, because the place decides where risk passes.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative: two quotes for the same imported product, one FOB origin port and one DDP to your warehouse. The FOB price looks lower, but you still pay ocean freight, insurance, duties and local delivery, so the comparison only works on landed cost.",
      ],
    ],
    why: [
      [
        "For importing distributors, Incoterms decide which costs belong in landed cost and who bears the loss if goods are damaged in transit. Agreeing the rule up front avoids disputes over a damaged or delayed container.",
      ],
    ],
    mistakes: [
      ["Comparing quotes on different Incoterms as if they were the same."],
      ["Using FOB for container shipments where FCA is often a better fit; check with your forwarder."],
      ["Leaving out the named place or the edition, which makes the rule ambiguous."],
    ],
    inApp: [
      "Supply Chain Manager does not record Incoterms, freight or duties. Include them in your unit cost if you want its price variance and margins to reflect landed cost.",
    ],
    faq: [
      {
        q: "Which Incoterm is best for a distributor?",
        a: ["It depends on your freight capability and risk appetite. Importers with a trusted forwarder often prefer FCA or FOB; those without often prefer DAP or DDP. Compare on landed cost."],
      },
      {
        q: "Do Incoterms say when I pay or who owns the goods?",
        a: ["No. They cover delivery, costs and risk transfer. Payment and ownership are set by the sales contract."],
      },
    ],
    sources: [
      { label: "International Chamber of Commerce, Incoterms rules FAQ", url: "https://www.iccwbo.org/incoterms_faq/" },
      { label: "International Trade Administration, Know your Incoterms", url: "https://trade.gov/know-your-incoterms" },
    ],
    related: ["total-cost-of-ownership", "lead-time", "purchase-order", "three-way-match", "drop-shipment"],
    updated: U,
  },
];
