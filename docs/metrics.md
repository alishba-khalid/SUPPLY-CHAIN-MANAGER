# Metrics & Business Logic

This document is the single source of truth for every calculation in Supply
Chain Manager. Business logic is implemented in `src/lib/metrics/*` and
`src/lib/insights/*` — never inside a UI component. If a formula changes,
update it here first.

All calculations are relative to the real system clock (`src/lib/dates.ts`).
Earlier sessions ran on a frozen in-memory mock dataset anchored to a fixed
`REFERENCE_DATE` for reproducibility; the app is now backed by a real
Postgres database (`prisma/schema.prisma`, seeded by `prisma/seed.ts`) that
can be reseeded at any time, so "today" has to mean today.

## Schema scope

The database has six tables: `warehouses`, `suppliers`, `products`,
`inventory`, `purchase_orders`, `transactions`. There is **no customer-order
or shipment table** in this pass. Two consequences, both intentional:

- **Logistics** is redefined as inbound purchase-order on-time delivery rate
  (see "Logistics Health" below) rather than shipment tracking — there are
  no shipments to track.
- `purchase_orders` has no separate received-quantity column — a row is
  either not yet received (`receivedDate` null) or received, with no
  partial-receipt state. "In full" is therefore structurally true for every
  received row; see "Supplier OTIF" and "Procurement Health" below for where
  this shows up.

---

## Average Daily Demand

**Business definition:** How many units of a SKU move out of a specific
warehouse on a typical day, based on recent actual activity — not a
manually entered forecast.

**Formula:**

```
Trailing 90-Day Outbound Quantity =
  sum(quantity) of SALE and TRANSFER_OUT transactions
  for this (productId, warehouseId), dated in (REFERENCE_DATE - 90, REFERENCE_DATE]

Average Daily Demand = Trailing 90-Day Outbound Quantity / 90
```

**Source data:** `InventoryTransaction[]`, filtered to `type ∈ {SALE, TRANSFER_OUT}`.
`TRANSFER_OUT` is included because it depletes stock at *this* warehouse
even though the company hasn't sold the unit — days-of-stock is a
warehouse-local metric.

**Time window:** Trailing 90 days.

**Edge case:** If trailing outbound quantity is `0`, Average Daily Demand
is `null` (not `0` and not `Infinity`). A `null` average daily demand means
"no recent movement," which downstream drives the `dead_stock` status.

**Example:** A SKU sold 630 units from Warehouse NDC over the last 90 days
→ Average Daily Demand = 630 / 90 = **7 units/day**.

**Implementation:** `trailingOutboundQuantity`, `averageDailyDemand` in
`src/lib/metrics/inventory.ts`.

---

## Days of Stock

**Business definition:** At the current sales pace, how many days until
this SKU runs out at this warehouse.

**Formula:**

```
Days of Stock = Available Inventory / Average Daily Demand
```

**Source data:** `InventoryRecord.quantityAvailable`, `Average Daily Demand`.

**Edge case:** If Average Daily Demand is `null` (no demand), Days of Stock
is `null` — never `Infinity`.

**Example:** Available = 84, Average Daily Demand = 21 → Days of Stock =
84 / 21 = **4 days**.

**Implementation:** `daysOfStock` in `src/lib/metrics/inventory.ts`.

---

## Safety Stock

**Business definition:** The buffer of stock a SKU should always keep on
hand to absorb demand variability during the "risky" half of a supplier's
lead time.

**Formula:**

```
Safety Lead Time = 50% of Supplier Lead Time (days)
Safety Stock = Average Daily Demand × Safety Lead Time
```

If Average Daily Demand is `null`, it is treated as `0` for this
calculation, giving Safety Stock = `0`.

**Source data:** `Average Daily Demand`, `Supplier.leadTimeDays` (via the
product's `primarySupplierId`).

**Example:** Average Daily Demand = 21, Supplier Lead Time = 8 days →
Safety Lead Time = 4 days → Safety Stock = 21 × 4 = **84 units**.

**Implementation:** `safetyStock`, `safetyLeadTimeDays` in
`src/lib/metrics/inventory.ts`.

---

## Reorder Point

**Business definition:** The inventory level at which a new purchase order
should be placed so stock doesn't run out before the replenishment arrives.

**Formula:**

```
Reorder Point = (Average Daily Demand × Supplier Lead Time) + Safety Stock
```

This is the standard reorder-point formula: expected demand during the
*full* lead time, plus the safety buffer.

**Example:** Average Daily Demand = 21, Lead Time = 8 days, Safety Stock =
84 → Reorder Point = (21 × 8) + 84 = **252 units**.

**Implementation:** `reorderPoint` in `src/lib/metrics/inventory.ts`.

---

## Overstock Threshold

**Business definition:** The point above which a SKU is carrying more
stock than it reasonably needs, tying up cash.

**Formula:**

```
Overstock Threshold = Safety Stock + (Average Daily Demand × 30)
```

i.e., safety stock plus 30 days of extra demand coverage.

**Example:** Safety Stock = 84, Average Daily Demand = 21 → Overstock
Threshold = 84 + (21 × 30) = **714 units**.

**Implementation:** `overstockThreshold` in `src/lib/metrics/inventory.ts`.

---

## Stock-out Risk, Overstock, Slow-Moving & Dead Stock (Inventory Status)

**Business definition:** A single, most-severe-wins classification per
(product, warehouse) used for table status columns and alerts.

**Formula (checked in order, first match wins):**

1. **Stock-out risk** — `availableQuantity <= 0` OR `daysOfStock <= 3`
2. **Dead stock** — Average Daily Demand is `null` (no outbound movement
   in the trailing 90 days) and stock remains on hand
3. **Slow-moving** — `daysOfStock > 180` (demand exists, but at the
   current pace this stock lasts more than 6 months)
4. **Low stock** — `availableQuantity < Safety Stock`
5. **Overstock** — `availableQuantity > Overstock Threshold`
6. **Healthy** — none of the above

**Edge cases:** Stock-out risk is checked before dead stock so a SKU with
zero stock and zero recent demand is reported as the more urgent
"stock-out risk," not "dead stock."

**Implementation:** `classifyInventoryStatus` in `src/lib/metrics/inventory.ts`.

---

## Demand Spike

**Business definition:** A (product, warehouse) position whose sales over the
last 7 days are far above its usual rate. Two distinct signals:

- **Sustained spike** — the week is still a spike after removing its single
  biggest day (demand has genuinely risen).
- **Single large order** — one day's sales account for the jump; the rest of
  the week wasn't unusual (e.g. a one-off bulk order).

**Formula:**

- *Recent* = units sold in the last 7 days (today and the 6 days before).
- *Usual rate* = the trimmed Average Daily Demand over the **90 days before
  that week** (days 7–96 ago), so the week being tested never inflates its own
  baseline. *Expected* = usual rate × 7.
- *σ₇* = winsorized daily σ over the same 90 days × √7.
- A week is a spike when **all** hold:
  - Recent ≥ **3×** Expected
  - Recent ≥ Expected + **3σ₇** (erratic/intermittent SKUs' normal lumps don't count)
  - Recent − Expected ≥ **10 units** (low-volume SKUs don't count)

**No usual rate (never flagged):** fewer than 10 selling days in the baseline,
or the position's first transaction is newer than the start of the baseline
window (days before the data began would otherwise read as zero sales).

**Worked examples:**

| Usual | Last 7 days | Result | Deciding rule |
|---|---|---|---|
| 10/day, steady | 40/day | sustained spike (4×) | all three pass |
| 10/day, steady | 7–13/day | none | ratio (1.0×) |
| 10/day, steady | 20/day | none | ratio (2×) |
| 1/week | 4 units | none | floor (3 units over) |
| 15-unit lumps every ~7 days (2/day) | three lumps, 45 units | none | 3σ (needs ~55) |
| 10/day, steady | 10/day + one 300-unit order | single large order | week minus biggest day = 60, not a spike |

**Where it shows:** its own alert (tier 4, after low stock) on a healthy or
overstocked position. On a position that already has a stockout or low-stock
alert, it's added to that alert's description instead of a second alert.

**Implementation:** `detectDemandSpike` in `src/lib/metrics/demand-spike.ts`;
alerts in `src/lib/insights/alerts.ts`.

---

## Inventory Turnover

**Business definition:** How many times a SKU's inventory is sold and
replaced over a period — a general efficiency signal (higher is usually
better, except for intentionally buffered critical parts).

**Formula:**

```
Inventory Turnover (annualized) =
  (Average Daily Demand × 365) / Average Available Inventory
```

**Source data:** `Average Daily Demand`, `inventory.quantity_on_hand`.

**Edge case:** `null` when Average Daily Demand is `null` or available
inventory is `0`.

**Status:** Formula defined here for Session 3; not yet wired into a
repository function, since inventory analytics ships in Session 3.

---

## ABC Inventory Analysis

**Business definition:** Classifies SKUs by their contribution to total
inventory value (or spend) so effort concentrates on the ~20% of SKUs that
drive ~80% of the value.

**Formula:**

```
SKU Value = quantityOnHand × unitCost
Sort all SKUs descending by SKU Value.
Cumulative % of total value determines the band:
  A: cumulative ≤ 80%
  B: 80% < cumulative ≤ 95%
  C: cumulative > 95%
```

**Status:** Formula defined here for Session 3; not yet implemented.

---

## Supplier OTIF (On-Time-In-Full)

**Business definition:** The percentage of a supplier's purchase orders
that arrived both on time and with the full ordered quantity — the
industry-standard measure of supplier reliability.

**Formula:**

```
On Time  = receivedDate <= expectedDate
In Full  = receivedDate is set   (see "Schema scope" — no partial-receipt column exists)
OTIF     = On Time AND In Full

Eligible Purchase Orders (trailing 90 days) =
  receivedDate is set AND receivedDate ∈ (today - 90, today]

Supplier OTIF % = (count(OTIF orders) / count(Eligible Purchase Orders)) × 100
```

**Source data:** `purchase_orders`.

**Time window:** Trailing 90 days, keyed on `receivedDate`.

**Edge case:** `null` when a supplier has zero eligible purchase orders in
the window — never reported as `0%`, which would misleadingly imply poor
performance rather than "no data."

**Example:** Supplier ABC has 47 eligible POs in the last 90 days; 34 of
them were both on time and in full → OTIF = 34/47 × 100 = **72.3%**.

**Implementation:** `computeSupplierPerformance`, `isOnTime`, `isInFull`,
`isOtif` in `src/lib/metrics/supplier.ts`.

---

## Supplier Score (Supplier Performance Health)

**Business definition:** A single company-wide supplier reliability
number, weighted so that high-spend suppliers influence the score more
than low-spend ones.

**Formula:**

```
Supplier Score = Σ(Supplier OTIF% × Supplier Trailing Spend) / Σ(Supplier Trailing Spend)
```

Only suppliers with a non-null OTIF% and non-zero trailing spend
contribute. Clamped to [0, 100].

**Example:** Supplier A: OTIF 90%, spend $50,000. Supplier B: OTIF 70%,
spend $10,000. Score = (90×50,000 + 70×10,000) / 60,000 = **86.7**.

**Implementation:** `supplierHealthScore` in `src/lib/metrics/supplier.ts`.

---

## Procurement Health

**Business definition:** A composite score for how well the procurement
process is performing — not just supplier reliability, but internal
fulfillment, speed, and cost discipline.

**Formula:**

```
Procurement Health =
    PO Fulfillment Score   × 40%
  + PO Cycle-Time Score     × 30%
  + Price Stability Score   × 30%
```

- **PO Fulfillment Score** = % of received POs that are "in full" — see
  "Schema scope": this is structurally 100 whenever any POs have been
  received, since there is no partial-receipt column to violate it. Kept as
  its own component (not inlined to a constant) so the limitation stays
  visible at its source, not silently dropped.
- **PO Cycle-Time Score** = % of received POs delivered on or before the
  expected delivery date (company-wide "on time" rate, no trailing window —
  all history).
- **Price Stability Score** = `100 - (avg absolute % deviation of paid
  unit price vs. the product's baseline unitCost × 200)`, clamped to
  [0, 100]. 0% average deviation → 100; ~50% average deviation → 0.

**Source data:** `purchase_orders`, `products.unit_cost` (baseline).

**Edge case:** `0` when there are no received purchase orders at all;
Price Stability defaults to `100` when there is no data to compare.

**Implementation:** `procurementHealthScore` and its three components in
`src/lib/metrics/procurement.ts`.

---

## PO Cycle Time

**Business definition:** How long, on average, it actually takes a
purchase order to arrive from the day it's placed — a raw operational
figure distinct from the 0–100 cycle-time *score* above.

**Formula:**

```
PO Cycle Time (days) = mean(receivedDate - orderDate), across all received purchase orders
```

**Edge case:** `null` when there are no received purchase orders.

**Implementation:** `averagePoCycleTimeDays` in `src/lib/metrics/procurement.ts`.

---

## Price Variance

**Business definition:** How far a specific purchase order's paid unit
price drifted from the product's baseline cost — the per-order figure
underlying the company-wide Price Stability Score.

**Formula:**

```
Price Variance % = (unitPrice - product.unitCost) / product.unitCost × 100
```

Positive = paid more than baseline; negative = paid less.

**Edge case:** `null` when the product's baseline unit cost is `0`.

**Implementation:** `priceVariancePercent` in `src/lib/metrics/procurement.ts`.

---

## Logistics Health

**Business definition:** How reliably inbound stock arrives on time.
Redefined for this schema (see "Schema scope") — there are no shipments to
track, so this reuses inbound purchase-order receipt timing, the closest
honest equivalent available. This intentionally overlaps with Procurement's
PO Cycle-Time Score (same underlying data); that's a disclosed limitation
of the narrower schema, not a bug.

**Formula:**

```
Eligible Purchase Orders (trailing 90 days) =
  receivedDate is set AND receivedDate ∈ (today - 90, today]

Logistics Health = (count(receivedDate <= expectedDate) / count(Eligible Purchase Orders)) × 100
```

Clamped to [0, 100]. `0` when there are no eligible purchase orders.

**Implementation:** `poOnTimeRate` in `src/lib/metrics/supplier.ts`,
`logisticsHealthScore` in `src/lib/metrics/logistics.ts`.

---

## Warehouse Health

**Business definition:** How well a warehouse is being run — neither
starved for space nor dangerously over capacity, and not full of
inventory problems.

**Formula:**

```
Capacity Utilization % = (Total Units On Hand / Warehouse Capacity Units) × 100

Capacity Utilization Score:
  70% – 90% utilization → 100 (the healthy band)
  < 70%  → scales linearly from 0 (at 0%) to 100 (at 70%)   — "underutilized"
  > 90%  → scales linearly from 100 (at 90%) down to 0 (at 130%+) — "risk"

Inventory Issue Rate Score =
  100 - (% of this warehouse's stocked SKUs whose InventoryInsight.status != "healthy")

Warehouse Health = (Capacity Utilization Score × 50%) + (Inventory Issue Rate Score × 50%)
```

**Source data:** `InventoryRecord[]` (summed per warehouse),
`Warehouse.capacityUnits`, `InventoryInsight[]`.

**Bands:** Below 70% utilization = **Underutilized**. 70–90% =
**Healthy**. Above 90% = **Risk**.

**Unknown capacity:** `Warehouse.capacityUnits` is nullable. A null (or
non-positive) capacity is *unknown* — never replaced by a number. For that
warehouse, utilization %, band, utilization score and Warehouse Health are
all null (shown as "Unknown" / "—"). The page-level and Overview warehouse
scores average only warehouses with a known capacity; if none has one, the
warehouse component is null and the overall Supply Chain Health Score is
the weighted average of the other four components (weights re-normalized).
Capacity totals and space utilization likewise cover only known-capacity
warehouses and say how many are unknown.

**Implementation:** `knownCapacity`, `capacityUtilization`,
`capacityUtilizationScore`, `inventoryIssueRateScore`,
`warehouseHealthScore`, `averageWarehouseHealth` in
`src/lib/metrics/warehouse.ts`.

---

## Supply Chain Health Score

**Business definition:** The single number that answers "how is my supply
chain doing overall," rolling up every domain into one score a busy owner
can check in five seconds.

**Formula:**

```
Supply Chain Health =
    Inventory Health    × 30%
  + Supplier Score       × 20%
  + Procurement Health   × 20%
  + Logistics Health     × 20%
  + Warehouse Health     × 10%
```

Each component is computed independently (see above) and rounded to the
nearest whole number only at the final step. Result clamped to [0, 100].

If no warehouse has a known capacity, Warehouse Health is null and is left
out: the score is the other four components divided by their combined
weight (0.9), not a 0 in the warehouse slot.

**Implementation:** `overallHealthScore` in `src/lib/metrics/health.ts`,
composed in `getSupplyChainHealth()` in `src/data/repositories/dashboard.ts`.

### Inventory Health (component)

**Formula:**

```
Inventory Health = (count(SKUs where Safety Stock <= Available <= Overstock Threshold) / count(SKU-warehouse pairs)) × 100
```

Clamped to [0, 100].

**Example:** 120 SKUs stocked across warehouses produce 120
product-warehouse pairs (one warehouse per SKU in this seed); 66 of them
sit within their healthy range → Inventory Health = 66 / 120 × 100 =
**55.0 → 55**.

**Implementation:** `inventoryHealthScore` in `src/lib/metrics/inventory.ts`.

---

## Trailing-Window Convention

Every "trailing 90-day" calculation in this document uses the same
inclusive/exclusive rule:

```
date ∈ (today - 90 days, today]
```

i.e. more than 90 days ago is excluded; exactly today is included.
Implemented once in `isWithinTrailingWindow()` (`src/lib/dates.ts`) and
reused everywhere so the window can never drift between modules. `today`
is the real system clock — see the note at the top of this document.

---

## Weekly Trend Series (Session 2 — Overview)

**Business definition:** The Overview page's trend charts need a value per
week, not a single trailing-window total, so week buckets are just the
trailing-window rule applied 12 times in a row instead of once.

**Formula:**

```
Week Bucket i (i = 0..11, i = 11 is the most recent) =
  (today - 7×(11-i) - 7, today - 7×(11-i)]
```

Each bucket is `(start, end]` — the exact same inclusive/exclusive shape as
`isWithinTrailingWindow`, just with a 7-day window anchored at each bucket's
own `end` instead of always at `today`.

**Implementation:** `weekBuckets` in `src/lib/metrics/trends.ts`.

### Procurement Spend Trend

Weekly sum of `quantity × unitPrice` across received purchase orders, keyed
on `receivedDate` — the same eligibility rule as trailing procurement
spend, bucketed instead of summed once.

**Implementation:** `procurementSpendTrend` in `src/lib/metrics/trends.ts`.

### On-Time Delivery Rate Trend

Weekly % of received purchase orders (keyed on `receivedDate`) with
`receivedDate <= expectedDate`. Unlike the scalar `null` convention used
elsewhere, a week with zero receipts plots as `0` — a chart series can't
render a `null` gap as cleanly as a single scalar metric can.

**Implementation:** `onTimeShipmentRateTrend` in `src/lib/metrics/trends.ts`.

### Purchase Order Volume Trend

Weekly sum of `quantity` across all purchase orders, keyed on `orderDate`.

**Implementation:** `poVolumeTrend` in `src/lib/metrics/trends.ts`.

### Inventory Movement Trend

Weekly sum of inbound (`direction == "IN"`) vs. outbound (`direction ==
"OUT"`) transaction quantity, keyed on transaction `date`.

**Implementation:** `inventoryMovementTrend` in `src/lib/metrics/trends.ts`.

---

## Recent Activity Feed (Session 2 — Overview)

**Business definition:** A single, chronological feed of notable supply
chain events, drawn from the exact same records as everything else — there
is no separate stored activity/event log.

**Formula:**

```
Window = trailing 14 days (isWithinTrailingWindow(date, 14))

Included events:
  - Purchase order received (receivedDate is set, keyed on receivedDate)
  - Inventory movement, where quantity >= 15 units
    (any transaction, keyed on date)
```

**Edge case:** The 15-unit threshold exists only to keep the feed
readable — without it, routine small transactions would flood out the
events actually worth a manager's attention. (Earlier sessions also
surfaced shipment-delayed and customer-order-fulfilled events; both concepts
were dropped from this schema — see "Schema scope" at the top of this doc.)

**Ordering:** Descending by date; same-day events are ordered
`po_received` → `inventory_movement` (most urgent first), then capped at
`limit` (default 15).

**Implementation:** `getRecentActivity` in `src/lib/insights/activity.ts`.

---

## Inventory Table (`/dashboard/inventory`)

**Business definition:** One row per SKU per warehouse, showing whether it
needs a reorder, is overstocked, or is dead stock — and, on demand, the
exact arithmetic behind that call.

This is a **different, page-specific classification** from "Stock-out Risk,
Overstock, Slow-Moving & Dead Stock" above, which drives the Overview health
score and alerts. Both share the same underlying `avg_daily_demand`/
`safety_stock` formulas, but this page's `stock_status` uses simpler,
literal thresholds given directly for this page — the two will disagree on
some rows by design, not by bug.

**Formula:**

```
days_of_history  = min(90, days since the earliest transaction for this SKU+warehouse)
                    (0 if there has never been a transaction at all)

avg_daily_demand = (outbound units, trailing 90 days) / days_of_history
                    null when days_of_history = 0 — never divide by zero,
                    never silently show 0

days_of_stock    = quantity_on_hand / avg_daily_demand
                    null when avg_daily_demand is null or 0 (would be
                    infinite — displayed as "No demand", never computed)

safety_stock     = avg_daily_demand × lead_time_days × 0.5
reorder_point    = (avg_daily_demand × lead_time_days) + safety_stock
                    both null when lead_time_days is unknown — never
                    defaulted to a number

stock_status (first match wins):
  1. no history, or confirmed zero demand over the trailing window -> dead_stock
  2. quantity_on_hand < reorder_point (only possible with a lead time on
     record)                                                        -> understock
  3. days_of_stock > 90                                              -> overstock
  4. reorder_point is unknown (no supplier lead time on record)      -> unknown
  5. otherwise                                                       -> healthy
```

**Edge cases** (all explicit, none silent):
- **Zero demand over 90 days** → `avg_daily_demand = 0`, not `null` — days_of_stock
  would be `0 / 0`, so it's reported `null` and shown as "No demand"; the
  row is classified `dead_stock`, never `overstock`.
- **No supplier lead time on record** (the product's `supplier_id` doesn't
  match any row in `suppliers`, or was never set) → `lead_time_days` is
  `null` via the `LEFT JOIN`; `safety_stock`/`reorder_point` are `null`; the
  row shows "No lead time on record" rather than a guessed number, and is
  classified `unknown` unless it's already `overstock` or `dead_stock`.
- **Fewer than 90 days of history** → `days_of_history` is whatever history
  actually exists (not hardcoded to 90), and the row is labeled with exactly
  how many days its figure is based on.

**ABC classification:**

```
demand_value = avg_daily_demand × unit_cost   (a $/day rate; null carries through)

Rank all rows with a non-null, non-zero demand_value descending by demand_value.
Walk the ranked list, keeping a running cumulative sum:
  A: cumulative running total <= 80% of the grand total demand_value
  B: 80% < cumulative <= 95%
  C: cumulative > 95%
Rows with no demand_value (dead stock, or no demand data) get no ABC class.
```

**Scale:** Computed with Postgres window functions over the *entire* table
(`prisma/schema.prisma`'s `inventory`/`transactions`/`products`/`suppliers`),
not in application code — a cumulative-percentage rank has to see every row
before a single page can be returned, so this runs once in the database,
then the same query applies filters, sorting, and `LIMIT`/`OFFSET` for
pagination. This is what keeps the page correct at 10,000+ SKUs without
pulling the whole table into Node on every request.

**Implementation:** `getInventoryTable` in `src/data/repositories/inventory.ts`
(raw SQL — see the CTE-by-CTE comment there for exactly how each formula
above maps to a query stage).

## Multi-tenant data isolation

**Requirement:** no user may ever see data belonging to another
organization, through any route, query, search, export, or URL
manipulation. This is a security control, not a feature, and is enforced
structurally rather than by convention.

**Mechanism chosen: a single scoped data-access layer**, not Postgres RLS.
Every DB read/write in this app funnels through the repository functions in
`src/data/repositories/*.ts`; each one takes `orgId: string` as a
**mandatory first argument** — there is no overload or default that omits
it, so forgetting it is a TypeScript compile error, not a runtime bug that
silently returns every org's rows. RLS was rejected for this stack
specifically: Prisma has no native per-request session-variable support
over a pooled connection, which would mean wrapping every query in an
explicit `$transaction` + `SET LOCAL` — more new discipline to get right,
not less, and it stacks badly on top of this project's already-flaky local
dev Postgres proxy.

**The four structural guarantees:**

1. **Mandatory parameter.** Every repository function's first parameter is
   `orgId`. There is no code path to `prisma.<model>.findMany()` (etc.)
   without one.
2. **Composite unique constraints.** `Product.sku`, `Supplier.supplierId`,
   `Warehouse.code`, `PurchaseOrder.poNumber` are `@@unique([orgId, ...])`,
   not bare `@unique`. Prisma's generated `findUnique` therefore *requires*
   the composite key (e.g. `{ orgId_sku: { orgId, sku } }`) — there is no
   longer a valid call shape that looks a row up by business key alone.
   This is also what makes fetch-by-ID safe by construction: looking up
   another org's real SKU/supplier/PO number with your own `orgId` simply
   returns `null` (query miss), and the caller's `notFound()` renders the
   same 404 whether the ID belongs to another org or doesn't exist at all —
   never a 403 that would confirm the record exists.
3. **Composite foreign keys.** Every relation FKs on `(orgId, ...)` — e.g.
   `Inventory` → `Warehouse` via `(orgId, warehouseId) -> Warehouse(orgId, id)`.
   Creating a row in one org that references another org's row is a
   **database constraint violation**, not just an application bug.
4. **A lint rule, not a convention.** `eslint.config.mjs` sets
   `no-restricted-imports` against `@/lib/prisma` for every file except
   `src/data/repositories/**/*.ts`. Importing the Prisma client anywhere
   else — a page, a component, an API route — is a lint error. This is the
   layer that stops a future change from quietly reaching around the scoped
   functions.

**Where `orgId` comes from:** exclusively `requireOrgId()` in `src/lib/auth.ts`,
which reads the signed Clerk session (`auth()` from `@clerk/nextjs/server`)
on the server. It is never read from a URL parameter, query string, request
body, or any other client-suppliable input. `src/proxy.ts` additionally
blocks any request under `/dashboard/*` that lacks a signed-in user with an
active organization before a page even renders.

**The raw-SQL exception, handled explicitly:** `getInventoryTable`'s
ABC-classification query (see above) can't be expressed with Prisma's query
builder, so it joins `inventory`/`products`/`suppliers`/`warehouses`/
`transactions` directly in SQL. Because those joins match on business keys
(`sku`, `supplier_id`, `warehouse_id`) that are only unique *within* an org,
every join condition also equates `org_id` across the two tables (e.g.
`JOIN products p ON p.sku = i.sku AND p.org_id = i.org_id`), and the base
CTE additionally filters `WHERE i.org_id = ${orgId}`. Without the per-join
`org_id` equality, two orgs reusing the same SKU string would silently join
across tenants — this is called out here because it is the one place in the
codebase where "add a `WHERE org_id = ...`" isn't sufficient by itself.

**Seeding:** `prisma/seed.ts` takes a required `--org <clerkOrgId>` argument
(no default) and derives its RNG seed from the org id, so two orgs seeded
this way get visibly different datasets — this is what makes the isolation
checks below meaningful rather than coincidental.
