import { g, type GlossaryTerm } from "./types";

const U = "2026-10-16";

export const PURCHASING_TERMS: GlossaryTerm[] = [
  {
    slug: "purchase-order",
    term: "Purchase Order (PO)",
    short: "Purchase order",
    category: "purchasing",
    definition:
      "A purchase order (PO) is the buyer's formal document to a supplier listing the items, quantities, prices, delivery date and terms being ordered.",
    explain: [
      [
        "Once the supplier accepts it, a PO is a commitment on both sides. It is also the record that later checks run against: what arrived ", g("goods-receipt", "at receipt"), " and what was billed on the invoice.",
      ],
      [
        "For planning, an open PO is supply on the way. It belongs in ", g("inventory-position", "inventory position"), " from the day it is placed until the goods are received or the order is cancelled.",
      ],
    ],
    example: [
      [
        "Illustrative: PO 10482 to a supplier for 480 units of SKU ELC-2006 at $4.10, expected in 8 days, net 30 payment terms, delivering to the central warehouse.",
      ],
    ],
    why: [
      [
        "Clean PO data, especially order date, expected date and received date, is what makes supplier on-time performance, cycle time and price variance measurable at all.",
      ],
    ],
    mistakes: [
      ["Leaving the expected date blank, so lateness can never be measured."],
      ["Not closing short-shipped or cancelled POs, which keeps phantom supply in the plan."],
      ["Ordering by phone or email with no PO, so nothing can be matched later."],
    ],
    inApp: [
      "Supply Chain Manager can draft purchase orders from its reorder suggestions and tracks each PO's order, expected and received dates.",
    ],
    related: ["purchase-requisition", "three-way-match", "po-cycle-time", "blanket-purchase-order", "goods-receipt"],
    updated: U,
  },
  {
    slug: "purchase-requisition",
    term: "Purchase Requisition",
    short: "Purchase requisition",
    category: "purchasing",
    definition:
      "A purchase requisition is an internal request to buy something, which is reviewed and approved before it becomes a purchase order to a supplier.",
    explain: [
      [
        "The requisition records the need; the PO records the commitment. Splitting the two lets a business control spending without everyone needing the authority to place orders.",
      ],
      [
        "Requisitions are most useful for spending that is not covered by an automatic rule: equipment, services, new products or one-off purchases. They create a record of who asked for what and why, which helps when reviewing spend later.",
      ],
    ],
    example: [
      [
        "Illustrative: the warehouse requests 10 replacement pallet racks. The requisition goes to the operations manager for approval, then purchasing turns it into a PO with the chosen supplier.",
      ],
    ],
    why: [
      [
        "For routine stock replenishment, a requisition step mostly adds delay. Many distributors reserve it for non-stock purchases and let approved reorder rules raise stock POs directly.",
      ],
    ],
    mistakes: [
      ["Routing every stock reorder through manual approval, which adds days to the lead time."],
      ["Approving requisitions without checking stock already on order."],
    ],
    related: ["purchase-order", "po-cycle-time", "spend-analysis", "three-way-match"],
    updated: U,
  },
  {
    slug: "three-way-match",
    term: "Three-Way Match",
    short: "Three-way match",
    category: "purchasing",
    definition:
      "Three-way match is the accounts-payable check that a supplier invoice agrees with both the purchase order and the goods receipt before it is paid.",
    explain: [
      [
        "The PO says what was ordered and at what price. The goods receipt says what actually arrived. The invoice says what the supplier is billing. If all three agree within tolerance, the invoice is paid; if not, it is held for review.",
      ],
      [
        "Tolerances are normally set as a percentage or an amount, so tiny rounding differences do not stop payment. Matches that fail usually go to purchasing to resolve with the supplier. Tracking which suppliers fail most often is a useful extra input into supplier performance reviews.",
      ],
    ],
    example: [
      [
        "Illustrative numbers: PO for 500 units at $4.00. Receipt shows 480 units. Invoice bills 500 at $4.20. The match fails on both quantity and price, so the invoice is held, saving $164 that would otherwise be overpaid (500 × $4.20 − 480 × $4.00).",
      ],
    ],
    why: [
      [
        "Short shipments and price creep are common and easy to miss at volume. Three-way match catches them before payment rather than months later.",
      ],
    ],
    mistakes: [
      ["Setting tolerances so wide that real discrepancies pass."],
      ["Receiving goods without recording quantities, which makes the match impossible."],
    ],
    related: ["purchase-order", "goods-receipt", "purchase-price-variance", "payment-terms"],
    updated: U,
  },
  {
    slug: "blanket-purchase-order",
    term: "Blanket Purchase Order",
    short: "Blanket PO",
    category: "purchasing",
    definition:
      "A blanket purchase order is a longer-term agreement covering repeated purchases from one supplier, with deliveries released against it over time.",
    explain: [
      [
        "It typically fixes prices and terms, and sometimes a total quantity or spend, for a period such as a year. Individual deliveries are then called off with releases instead of a full PO each time.",
      ],
      [
        "Blanket orders work best when demand is steady enough that the total commitment is low risk, and when the supplier gives something in return, such as fixed prices, priority allocation or a shorter lead time on each release. Each release should still be sized from current demand, not a fixed monthly quantity agreed at the start.",
      ],
    ],
    example: [
      [
        "Illustrative: a blanket PO for 12,000 units of packaging over 12 months at a fixed price, with monthly releases of about 1,000 units adjusted to actual demand.",
      ],
    ],
    why: [
      [
        "Blanket orders cut paperwork and lock in pricing for steady, high-volume items. They also give suppliers visibility to plan, which can shorten lead times.",
      ],
    ],
    mistakes: [
      ["Committing to a total quantity based on an optimistic forecast."],
      ["Losing track of how much of the blanket has been released."],
    ],
    related: ["purchase-order", "quantity-break", "total-cost-of-ownership", "sales-and-operations-planning"],
    updated: U,
  },
  {
    slug: "po-cycle-time",
    term: "Purchase Order Cycle Time",
    short: "PO cycle time",
    category: "purchasing",
    definition:
      "Purchase order cycle time is how long purchase orders actually take from the day they are placed to the day the goods are received.",
    explain: [
      [
        "It is measured lead time. Comparing it with the supplier's quoted lead time shows whether your planning assumptions hold. Including the time before the PO is sent, from need to approval, shows how much delay is internal.",
      ],
      [
        "It is worth measuring cycle time per supplier and, for important suppliers, per product family. A supplier can be fast on stocked items and slow on items they make to order. Planning one lead time for everything they supply hides that difference.",
      ],
    ],
    formula: ["PO Cycle Time (days) = average of (Received Date − Order Date) across received POs"],
    example: [
      [
        "Illustrative numbers: five POs took 9, 12, 14, 11 and 13 days, an average cycle time of 11.8 days against a quoted 10. Planning on 10 days leaves almost two days uncovered on every order.",
      ],
    ],
    why: [
      [
        "Cycle time feeds safety stock and reorder points directly. A rising cycle time is often the first visible sign of a supplier struggling.",
      ],
    ],
    mistakes: [
      ["Averaging across suppliers that have very different lead times."],
      ["Leaving open, unreceived POs out of the picture, which hides the slowest orders."],
    ],
    inApp: [
      "Supply Chain Manager reports average PO cycle time from order date to received date on the Procurement page.",
    ],
    related: ["lead-time", "lead-time-variability", "on-time-delivery-rate", "purchase-order"],
    updated: U,
  },
  {
    slug: "purchase-price-variance",
    term: "Purchase Price Variance (PPV)",
    short: "Purchase price variance",
    category: "purchasing",
    definition:
      "Purchase price variance (PPV) is the difference between the price actually paid for an item and its standard or expected cost.",
    explain: [
      [
        "A positive variance means you paid more than planned, which erodes margin if selling prices do not move. Tracked per supplier and SKU, PPV shows where price increases are creeping in and which suppliers hold their prices.",
      ],
      [
        "A negative variance, paying less than standard, is not automatically good news. It can come from buying larger quantities than needed to earn a discount, which raises carrying cost, or from a cheaper but less reliable supplier. Reviewing variances alongside quantity and supplier performance gives the full picture.",
      ],
    ],
    formula: [
      "Price Variance % = (Price Paid − Standard Cost) ÷ Standard Cost × 100",
      "Variance Value = (Price Paid − Standard Cost) × Quantity",
    ],
    example: [
      [
        "Illustrative numbers: standard cost $4.00, paid $4.30 on 2,000 units. Price variance is +7.5%, or $600 more than planned on that order.",
      ],
    ],
    why: [
      [
        "Distributors run on thin margins. Small, unnoticed price increases across many SKUs can wipe out a year's margin improvement elsewhere.",
      ],
    ],
    mistakes: [
      ["Leaving standard costs out of date, so every variance looks large or small."],
      ["Ignoring freight and duties, which belong in ", g("landed-cost", "landed cost"), "."],
    ],
    inApp: [
      "Supply Chain Manager calculates price variance for each purchase order line against the product's baseline unit cost.",
    ],
    related: ["landed-cost", "three-way-match", "spend-analysis", "total-cost-of-ownership"],
    updated: U,
  },
  {
    slug: "lead-time-variability",
    term: "Lead Time Variability",
    short: "Lead time variability",
    category: "purchasing",
    definition:
      "Lead time variability is how much a supplier's actual delivery times swing around their average, measured as the spread of past lead times.",
    explain: [
      [
        "Two suppliers can both average 10 days. One delivers in 9 to 11; the other in 5 to 20. The second needs far more safety stock, because you must plan for the late deliveries, not the average.",
      ],
      [
        "Measuring it needs only three dates per purchase order: when it was placed, when it was expected and when it arrived. With those, you can calculate both the average lead time and its spread for every supplier, and see whether late deliveries are random or concentrated on particular items or seasons.",
      ],
    ],
    formula: ["Lead Time Variability = Standard Deviation of actual lead times (days)"],
    example: [
      [
        "Illustrative numbers: supplier A's last receipts took 9, 10, 11, 10 and 10 days (standard deviation about 0.7). Supplier B's took 5, 18, 7, 20 and 10 days (standard deviation roughly 6). Both average 10 to 12 days, but B can be more than a week late with no warning.",
      ],
    ],
    why: [
      [
        "Variability, more than the average, causes stockouts. Reducing it, by changing supplier, agreeing delivery windows or ordering earlier, often cuts safety stock more than any forecasting change.",
      ],
    ],
    mistakes: [
      ["Using only the average lead time in safety stock calculations."],
      ["Judging a supplier on a handful of receipts."],
    ],
    related: ["lead-time", "po-cycle-time", "on-time-delivery-rate", "safety-time", "dual-sourcing"],
    guides: ["safety-stock-formula", "supplier-otif"],
    updated: U,
  },
  {
    slug: "on-time-delivery-rate",
    term: "On-Time Delivery Rate (OTD)",
    short: "On-time delivery rate",
    category: "purchasing",
    definition:
      "On-time delivery rate (OTD) is the percentage of orders that arrived on or before the promised date, without checking whether the quantity was complete.",
    explain: [
      [
        "OTD is the timing half of OTIF (on time in full). It is useful on its own for spotting late suppliers, but a supplier can score well on OTD while regularly shipping short, which only OTIF catches.",
      ],
      [
        "Agreeing what 'on time' means matters. Some businesses allow a grace window of a day or two; others count any delivery after the expected date as late. Either can work, but the definition must be applied the same way to every supplier, or the comparison is meaningless.",
      ],
    ],
    formula: ["OTD % = Orders received on or before expected date ÷ Orders received × 100"],
    example: [
      [
        "Illustrative numbers: 40 POs received last quarter, 34 on or before the expected date. OTD = 85%. If 6 of those 34 were short-shipped, OTIF would be 70%.",
      ],
    ],
    why: [
      [
        "It shows which suppliers' dates you can plan on. Trending it weekly shows whether a supplier is slipping before it becomes a stockout.",
      ],
    ],
    mistakes: [
      ["Counting the supplier's ship date instead of your receipt date."],
      ["Reporting OTD without OTIF and missing short shipments."],
    ],
    inApp: [
      "Supply Chain Manager charts the weekly share of received purchase orders that arrived by their expected date.",
    ],
    related: ["lead-time-variability", "po-cycle-time", "perfect-order-rate", "expediting"],
    guides: ["supplier-otif"],
    updated: U,
  },
  {
    slug: "expediting",
    term: "Expediting",
    short: "Expediting",
    category: "purchasing",
    definition:
      "Expediting is speeding up an order that is already placed, by pushing the supplier, paying for faster shipping or splitting the delivery, to avoid a stockout.",
    explain: [
      [
        "It is a recovery tool, not a plan. Every expedite costs something: premium freight, supplier goodwill or a planner's afternoon. Frequent expediting usually points to reorder points that are too low or lead times that are wrong.",
      ],
    ],
    example: [
      [
        "Illustrative numbers: a SKU will run out in 4 days and the PO is due in 8. Air freight for part of the order costs $350 extra. If the stockout would lose about $1,200 of margin, the expedite is worth it; if another warehouse can transfer stock for $80, that is better still.",
      ],
    ],
    why: [
      [
        "Knowing the cost of each option, expedite, transfer or accept the backorder, lets purchasing make the cheapest call quickly instead of defaulting to the most expensive.",
      ],
    ],
    mistakes: [
      ["Expediting by habit rather than comparing it with a transfer."],
      ["Never tracking expedite costs, so the underlying planning problem is never fixed."],
    ],
    related: ["inventory-transfer", "stockout-cost", "on-time-delivery-rate", "lead-time"],
    guides: ["reorder-expedite-or-transfer"],
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
    example: [
      [
        "Illustrative: a distributor buys 70% of a key cable from its main supplier and 30% from a second. When the main supplier's lead time doubles during a shortage, the second can absorb more volume within weeks.",
      ],
    ],
    why: [
      [
        "For A-class items with long or variable lead times, a qualified second source is often cheaper insurance than holding weeks of extra safety stock.",
      ],
    ],
    mistakes: [
      ["Splitting volume so evenly that neither supplier sees you as important."],
      ["Treating two parts as interchangeable without checking specifications."],
    ],
    related: ["lead-time-variability", "request-for-quote", "total-cost-of-ownership", "spend-analysis"],
    updated: U,
  },
  {
    slug: "request-for-quote",
    term: "Request for Quote (RFQ)",
    short: "RFQ",
    category: "purchasing",
    definition:
      "A request for quote (RFQ) asks several suppliers to price a defined list of items, quantities and terms so their offers can be compared side by side.",
    explain: [
      [
        "A good RFQ fixes everything except price: specifications, volumes, delivery locations, lead times and payment terms. Otherwise offers are not comparable, and the cheapest unit price may hide longer lead times or worse terms.",
      ],
      [
        "Sharing realistic volumes in an RFQ improves the quality of quotes. Suppliers price risk, so vague or inflated volumes either lead to padded prices or to commitments you cannot meet. Including recent purchase history by SKU gives suppliers a clear basis to price from.",
      ],
    ],
    example: [
      [
        "Illustrative: an RFQ for 40 fastener SKUs with annual volumes, required lead times and delivery to two warehouses. Supplier A is 4% cheaper, but supplier B quotes half the lead time, which could cut safety stock by more than the price difference.",
      ],
    ],
    why: [
      [
        "Regular RFQs on high-spend categories keep prices current and surface alternative suppliers before you need them.",
      ],
    ],
    mistakes: [
      ["Comparing unit prices only, without lead time, MOQ, freight and terms."],
      ["Running an RFQ with no real intention to switch, which wears out supplier goodwill."],
    ],
    related: ["total-cost-of-ownership", "dual-sourcing", "quantity-break", "spend-analysis"],
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
        "The current edition, Incoterms 2020, has 11 rules. Some apply to any transport mode, such as EXW (ex works), FCA, CPT, CIP, DAP, DPU and DDP (delivered duty paid). Others apply only to sea and inland waterway transport: FAS, FOB (free on board), CFR and CIF.",
      ],
      [
        "The rule chosen moves cost and risk between buyer and seller. Under EXW the buyer handles almost everything from the seller's premises; under DDP the seller delivers to the buyer with duties paid.",
      ],
    ],
    example: [
      [
        "Illustrative: two quotes for the same imported product, one FOB origin port and one DDP to your warehouse. The FOB price looks lower, but you still pay ocean freight, insurance, duties and local delivery, so the comparison only works on ", g("landed-cost", "landed cost"), ".",
      ],
    ],
    why: [
      [
        "For importing distributors, Incoterms decide which costs belong in landed cost and who bears the loss if goods are damaged in transit.",
      ],
    ],
    mistakes: [
      ["Comparing quotes on different Incoterms as if they were the same."],
      ["Using FOB for container shipments where FCA is often a better fit; check with your forwarder."],
    ],
    related: ["landed-cost", "total-cost-of-ownership", "lead-time", "advance-shipping-notice"],
    updated: U,
  },
  {
    slug: "advance-shipping-notice",
    term: "Advance Shipping Notice (ASN)",
    short: "ASN",
    category: "purchasing",
    definition:
      "An advance shipping notice (ASN) is a supplier's message, sent when goods ship, listing what is on the way, in what quantities and when it should arrive.",
    explain: [
      [
        "An ASN turns 'the PO is open' into 'these 480 units shipped today and arrive Thursday'. It lets the warehouse plan receiving labor and lets purchasing spot short shipments before the truck arrives.",
      ],
      [
        "ASNs are usually sent electronically, by EDI or through a supplier portal, but even an emailed packing list sent at dispatch gives most of the benefit. The point is timing: the notice arrives before the goods do. Asking key suppliers for one is often a quick win, because it costs them little and gives you days of warning about short or split shipments.",
      ],
    ],
    example: [
      [
        "Illustrative: a PO for 500 units gets an ASN for 420. Purchasing knows two days early that 80 units are short and can decide whether to chase the balance or cover it elsewhere.",
      ],
    ],
    why: [
      [
        "ASNs make in-transit stock visible and receiving faster, especially when they include carton or pallet barcodes that the warehouse can scan.",
      ],
    ],
    mistakes: [
      ["Receiving against the ASN without checking the physical goods."],
      ["Ignoring ASN quantities and planning from the original PO."],
    ],
    related: ["goods-receipt", "pipeline-inventory", "available-to-promise", "dock-to-stock-time"],
    updated: U,
  },
  {
    slug: "goods-receipt",
    term: "Goods Receipt",
    short: "Goods receipt",
    category: "purchasing",
    definition:
      "A goods receipt records stock arriving from a supplier: what came in, how many units, in what condition and against which purchase order.",
    explain: [
      [
        "It is the moment purchased stock becomes on-hand inventory, and the second document in a three-way match. The received date it records is also what supplier on-time performance is measured against.",
      ],
      [
        "Receiving is also where many data problems start. Counting and recording what actually arrived, by SKU and unit of measure, protects every later number: on-hand stock, supplier performance, three-way match and the next reorder. A quick receiving check is far cheaper than finding the error at the next stocktake.",
      ],
    ],
    example: [
      [
        "Illustrative: a delivery for PO 10482 arrives with 480 units, 6 damaged. The receipt records 474 good units into stock and 6 to a returns location, and the PO stays open for the shortfall or is closed short.",
      ],
    ],
    why: [
      [
        "Accurate, prompt receipts keep inventory data and supplier scorecards honest. Goods left unreceived on the dock are invisible to sales and planning.",
      ],
    ],
    mistakes: [
      ["Receiving the full PO quantity without counting."],
      ["Recording receipts days after the goods arrived, which makes suppliers look late."],
    ],
    related: ["three-way-match", "advance-shipping-notice", "putaway", "dock-to-stock-time", "purchase-order"],
    updated: U,
  },
  {
    slug: "quantity-break",
    term: "Quantity Break (Volume Discount)",
    short: "Quantity break",
    category: "purchasing",
    definition:
      "A quantity break is a lower unit price a supplier offers when you buy at or above a set quantity, such as $4.00 each for 500+ units versus $4.40 below.",
    explain: [
      [
        "Price breaks reward bigger orders, but bigger orders mean more stock. The right comparison is the saving on the purchase against the extra carrying cost of holding the additional units until they sell.",
      ],
      [
        "Price breaks can also be combined across SKUs from the same supplier, for example on total order value. In that case, adding a few fast-moving items to an order can earn the break without overstocking any single line, which is usually better than buying extra of one slow item.",
      ],
    ],
    formula: [
      "Saving = (Price below break − Price at break) × Quantity at break",
      "Extra carrying cost ≈ Extra average stock × Unit cost × Annual carrying rate × (Holding time in years)",
    ],
    example: [
      [
        "Illustrative numbers: you need 300 units a month. Ordering 500 instead of 300 earns $0.40 off each, a $200 saving. The extra 200 units take about two-thirds of a month to sell; at a 25% annual carrying rate on $4.00 that costs roughly $11. The break is worth taking.",
      ],
    ],
    why: [
      [
        "Breaks are worth taking on steady sellers and often not on slow ones, where the extra stock may sit for months or never sell.",
      ],
    ],
    mistakes: [
      ["Chasing breaks on slow movers and creating overstock."],
      ["Ignoring storage space or shelf-life limits."],
    ],
    related: ["economic-order-quantity", "minimum-order-quantity", "inventory-carrying-cost", "blanket-purchase-order"],
    updated: U,
  },
  {
    slug: "payment-terms",
    term: "Payment Terms",
    short: "Payment terms",
    category: "purchasing",
    definition:
      "Payment terms set when a supplier invoice must be paid and any early-payment discount, for example net 30 or 2/10 net 30.",
    explain: [
      [
        "Net 30 means the full amount is due 30 days after the invoice date. 2/10 net 30 means you may take a 2% discount if you pay within 10 days; otherwise the full amount is due in 30.",
      ],
      [
        "Skipping an early-payment discount is effectively borrowing from the supplier at a high rate. For 2/10 net 30, paying on day 30 instead of day 10 costs about 2% for 20 days, which works out to roughly 37% a year.",
      ],
    ],
    formula: ["Annualized cost of skipping the discount ≈ Discount ÷ (1 − Discount) × 365 ÷ (Net days − Discount days)"],
    example: [
      [
        "Illustrative numbers: on a $20,000 invoice at 2/10 net 30, paying by day 10 saves $400. Waiting until day 30 keeps $19,600 in your account for 20 more days at that $400 cost.",
      ],
    ],
    why: [
      [
        "Payment terms shape the ", g("cash-to-cash-cycle", "cash-to-cash cycle"), ". Longer supplier terms fund inventory with the supplier's money; early-payment discounts can be a better return than most uses of spare cash.",
      ],
    ],
    mistakes: [
      ["Ignoring early-payment discounts without working out their annual rate."],
      ["Paying early by default and draining cash with no discount."],
    ],
    related: ["cash-to-cash-cycle", "three-way-match", "consignment-inventory", "total-cost-of-ownership"],
    updated: U,
  },
  {
    slug: "total-cost-of-ownership",
    term: "Total Cost of Ownership (TCO)",
    short: "Total cost of ownership",
    category: "purchasing",
    definition:
      "Total cost of ownership (TCO) is every cost of buying from a supplier, such as freight, duties, quality issues and stock held for its lead time, not just price.",
    explain: [
      [
        "The cheapest unit price is often not the cheapest supplier. A longer, less reliable lead time means more safety stock; poor quality means returns and rework; small MOQs or better terms save cash. TCO puts them on one scale.",
      ],
    ],
    formula: ["TCO = Purchase price + Freight & duties + Inventory carrying cost + Quality & returns cost + Ordering & admin cost"],
    example: [
      [
        "Illustrative numbers: supplier A is $10.00 a unit with a 30-day lead time; supplier B is $10.40 with 7 days. At 1,000 units a month, A's extra lead time means holding roughly 770 more units in transit and buffer. At a 25% carrying rate that is about $1,900 a year, against $4,800 a year more paid to B. A still wins on cost, but by much less than the price gap suggests.",
      ],
    ],
    why: [
      [
        "TCO keeps supplier choices from being made on unit price alone, which is how many distributors end up with long, unreliable supply chains for small savings.",
      ],
    ],
    mistakes: [
      ["Comparing suppliers on price per unit only."],
      ["Ignoring the safety stock a long lead time forces you to hold."],
    ],
    related: ["landed-cost", "request-for-quote", "dual-sourcing", "inventory-carrying-cost"],
    updated: U,
  },
  {
    slug: "spend-analysis",
    term: "Spend Analysis",
    short: "Spend analysis",
    category: "purchasing",
    definition:
      "Spend analysis groups past purchases by supplier, category and SKU to show where money goes and where better prices or terms are possible.",
    explain: [
      [
        "It usually starts from purchase order or invoice data. The first view is often a surprise: spend spread across more suppliers than anyone realized, or one category growing much faster than sales.",
      ],
      [
        "Clean data is most of the work. Standardizing supplier names, grouping items into categories and separating stock purchases from expenses usually takes longer than the analysis itself. Once done, the same structure can be refreshed every quarter with little effort.",
      ],
    ],
    example: [
      [
        "Illustrative: a spend review shows the same packaging bought from five suppliers at prices ranging over 20%. Consolidating to two suppliers with a blanket order cuts the average price and simplifies ordering.",
      ],
    ],
    why: [
      [
        "Negotiating power comes from knowing your volume. Spend analysis also shows which suppliers deserve the most attention in performance reviews.",
      ],
    ],
    mistakes: [
      ["Analyzing invoices with inconsistent supplier names, which splits the same supplier into many."],
      ["Looking only at spend, not at the lead time and reliability bought with it."],
    ],
    related: ["purchase-price-variance", "abc-analysis", "request-for-quote", "dual-sourcing"],
    updated: U,
  },
  {
    slug: "drop-shipment",
    term: "Drop Shipment",
    short: "Drop shipment",
    category: "purchasing",
    definition:
      "A drop shipment is when the supplier ships an order directly to your customer, so the goods never pass through your warehouse.",
    explain: [
      [
        "You still sell to the customer and buy from the supplier, but you skip receiving, storage and picking. It suits bulky, slow-moving or made-to-order items you would not want to stock.",
      ],
      [
        "Drop-ship orders still need tracking: the supplier's dispatch confirmation and delivery proof should come back to you, because the customer will call you, not the supplier, if something goes wrong. Many distributors keep a short list of reliable drop-ship partners and use them only for the lines where that reliability is proven.",
      ],
    ],
    example: [
      [
        "Illustrative: a customer orders a large industrial cabinet you sell twice a year. Rather than stocking it, you raise a PO with the manufacturer, who delivers straight to the customer's site.",
      ],
    ],
    why: [
      [
        "Drop shipping lets a distributor offer a wider range without holding the inventory. The trade-off is less control over delivery time and packaging, and thinner margins on some lines.",
      ],
    ],
    mistakes: [
      ["Counting drop-ship sales in warehouse demand, which inflates stock forecasts."],
      ["Promising delivery dates without confirming the supplier's lead time."],
    ],
    related: ["back-to-back-order", "sku-rationalization", "order-cycle-time", "purchase-order"],
    updated: U,
  },
  {
    slug: "back-to-back-order",
    term: "Back-to-Back Order (Special Order)",
    short: "Back-to-back order",
    category: "purchasing",
    definition:
      "A back-to-back order is a purchase order raised only when a specific customer order arrives, so the item is bought for that customer rather than for stock.",
    explain: [
      [
        "The goods may come into your warehouse and go straight out, or be drop shipped. Either way, there is no stock risk: you buy only what is already sold.",
      ],
      [
        "The trade-off is lead time. A customer who could have had the item today from stock now waits for the supplier's lead time plus your handling. That is usually acceptable for unusual items, and it is honest to tell customers which lines are stocked and which are ordered in, so they can plan.",
      ],
    ],
    example: [
      [
        "Illustrative: a contractor orders 40 units of a light fitting you do not stock. You raise a PO for exactly 40 with a 5-day lead time and promise delivery in 7 days.",
      ],
    ],
    why: [
      [
        "Moving rarely sold SKUs to back-to-back ordering is one of the cleanest ways to cut slow-moving stock while still serving the customers who need them.",
      ],
    ],
    mistakes: [
      ["Stocking items that sell only through occasional special orders."],
      ["Losing the link between the customer order and the PO, so the goods are not reserved on arrival."],
    ],
    related: ["drop-shipment", "sku-rationalization", "slow-moving-inventory", "allocated-inventory"],
    updated: U,
  },
];
