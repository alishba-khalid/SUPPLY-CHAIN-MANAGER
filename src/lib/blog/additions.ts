import type { Block } from "./posts";
import { P, H, UL, F, N, gl, bg, ft } from "./helpers";

/**
 * Extra sections appended to existing guides (2026-11-24) to bring each one
 * to 500+ words and to state the product's real behaviour where an older
 * paragraph was too general. Appended in posts.ts; keyed by guide slug.
 */
export const ADDITIONS: Record<string, Block[]> = {
  "safety-stock-formula": [
    H("The statistical version, and what the app uses"),
    P("The half-lead-time rule above is a simple starting point. When you have enough daily demand history, a statistical method ties the buffer to a service level you choose: a z-score for that service level times the standard deviation of daily demand times the square root of the lead time. See ", gl("service-level", "service level"), " for the z-scores and ", { href: "/tools/safety-stock-calculator", text: "the safety stock calculator" }, " to try both methods."),
    F("Safety stock = z × σ(daily demand) × √(lead time in days)"),
    P("Supply Chain Manager uses this statistical method, at a fixed 95% service level (z = 1.65), whenever a SKU's daily demand varies, and falls back to the simple rule (half the supplier's lead time of demand) when it does not. The service level is not adjustable per SKU today."),
  ],
  "supplier-otif": [
    H("Read OTIF alongside lead time and days late"),
    P("OTIF is a yes or no per order, so it hides how late the late ones were and whether the average lead time is drifting. Keep three numbers together for each supplier: the on-time share, the average days late among the late orders, and the average and spread of lead time. A supplier at 85% on time whose late orders are a day late is far easier to plan around than one at 85% whose late orders are three weeks late."),
    P("Remember what you can measure. 'In full' needs the quantity received recorded against each order. If your data holds only a received date, you can measure the on-time half only, and it is better to call it on-time delivery than to imply you are checking quantities."),
  ],
  "overstock-vs-dead-stock": [
    H("A monthly routine for overstock"),
    UL(
      ["List positions above their overstock threshold, sorted by the value tied up, so the biggest cash items come first."],
      ["Stop automatic reorders on those items and check whether any open purchase orders can still be reduced or cancelled."],
      ["Look for another warehouse where the item sells. A transfer is often the cheapest fix. See ", bg("multi-warehouse-inventory-planning", "multi-warehouse planning"), "."],
      ["For what is left, choose between a supplier return, a promotion or bundle, or a write-down, and write down the reason so the same ordering mistake is not repeated."],
    ),
    P("Doing this monthly keeps the list short. Doing it once a year turns overstock into dead stock."),
  ],
  "reorder-expedite-or-transfer": [
    H("Keep a log of what each rescue cost"),
    P("Every expedite and emergency transfer is a symptom. Record the SKU, the action, what it cost and the cause: a supplier late, a reorder point too low, a demand jump, or an order raised too late. After a quarter, the same cause appearing again and again points at the fix, which is usually a corrected lead time or reorder point, not a faster courier."),
    P("A useful rule of thumb is that a SKU rescued more than twice in a quarter should have its demand figure, lead time and safety stock reviewed before the next order."),
  ],
  "inventory-kpis-for-distributors": [
    H("Give each KPI a trigger"),
    UL(
      ["Days of supply below lead time on an A item: review today."],
      ["Overstock value rising two months in a row: review the biggest five items."],
      ["A supplier's on-time rate below the level you can plan around: add buffer or find a second source."],
      ["Any KPI nobody has acted on for a quarter: drop it from the dashboard."],
    ),
  ],
  "how-to-set-min-max-levels": [
    H("A quarterly review checklist"),
    UL(
      ["Re-pull 60 to 90 days of demand and replace any figure that moved by more than about a fifth."],
      ["Replace quoted lead times with measured ones for your top suppliers."],
      ["Check that no max exceeds the space or a sensible number of weeks of demand."],
      ["Look at the items that triggered an emergency order in the quarter and raise their minimum."],
    ),
    P("The review takes an hour for a few hundred SKUs once the sheet is set up, and it is the step that stops min/max drifting into stockouts and overstock."),
  ],
  "first-90-days-with-inventory-planning-software": [
    H("Signs it is working"),
    UL(
      ["The planner opens the tool first thing and trusts the top of the list."],
      ["Emergency orders and expedites fall month on month."],
      ["Disagreements with the tool are explained by data you can fix, not by mystery."],
      ["The old spreadsheet is no longer updated, and nobody misses it."],
    ),
    P("If after 60 days the suggestions are still wrong on your fastest sellers, stop and investigate the data before widening the rollout."),
  ],
  "purchase-order-checklist-for-distributors": [
    H("Make the checklist stick"),
    P("Print it, or add it as a pre-send step in your ordering template, and tick it for every order above a value you choose. Review ten orders a month against it. The point is not paperwork. It is to catch the two or three recurring mistakes, such as ordering from on-hand stock instead of inventory position, or leaving the expected date blank, before they cost money."),
  ],
  "inventory-turnover-by-category-in-excel": [
    H("Reading the result by category"),
    P("Look first at the categories with the most days of inventory and the most value, because a slow category with little stock behind it does not matter much. For each slow category ask three questions: is the margin high enough to justify it, are there a few SKUs causing most of the stock, and is the slowness new or long-standing? New slowness often has a cause you can fix, such as a supplier minimum that grew. Long-standing slowness is a range decision."),
  ],
  "supplier-scorecard-template": [
    H("Common mistakes with scorecards"),
    UL(
      ["Scoring on too few orders. Three late deliveries out of five tells you little."],
      ["Using the supplier's ship date, not your receipt date."],
      ["Combining very different product families into one supplier score."],
      ["Never writing down what was agreed, so the next review starts from scratch."],
    ),
  ],
};
