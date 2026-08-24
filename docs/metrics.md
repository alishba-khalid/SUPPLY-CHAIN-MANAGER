# Metrics & Business Logic

This document is the single source of truth for every calculation in Supply
Chain Manager. Business logic is implemented in `src/lib/metrics/*` and
`src/lib/insights/*` — never inside a UI component. If a formula changes,
update it here first.

All calculations are relative to `REFERENCE_DATE = "2026-08-24"`
(`src/data/mock/dates.ts`), never the system clock, so results are
reproducible on every run.

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

## Inventory Turnover

**Business definition:** How many times a SKU's inventory is sold and
replaced over a period — a general efficiency signal (higher is usually
better, except for intentionally buffered critical parts).

**Formula:**

```
Inventory Turnover (annualized) =
  (Average Daily Demand × 365) / Average Available Inventory
```

**Source data:** `Average Daily Demand`, `InventoryRecord.quantityAvailable`.

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
On Time  = actualDeliveryDate <= expectedDeliveryDate
In Full  = sum(receivedQuantity) >= sum(orderedQuantity)  (across PO lines)
OTIF     = On Time AND In Full

Eligible Purchase Orders (trailing 90 days) =
  status == "received" AND actualDeliveryDate is set
  AND actualDeliveryDate ∈ (REFERENCE_DATE - 90, REFERENCE_DATE]

Supplier OTIF % = (count(OTIF orders) / count(Eligible Purchase Orders)) × 100
```

**Source data:** `PurchaseOrder[]`, `PurchaseOrderLine[]`.

**Time window:** Trailing 90 days, keyed on `actualDeliveryDate`.

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

- **PO Fulfillment Score** = % of received POs where received quantity ≥
  ordered quantity (company-wide "in full" rate).
- **PO Cycle-Time Score** = % of received POs delivered on or before the
  expected delivery date (company-wide "on time" rate).
- **Price Stability Score** = `100 - (avg absolute % deviation of paid
  unit cost vs. the product's baseline unitCost × 200)`, clamped to
  [0, 100]. 0% average deviation → 100; ~50% average deviation → 0.

**Source data:** `PurchaseOrder[]`, `PurchaseOrderLine.unitCost`,
`Product.unitCost` (baseline).

**Edge case:** `0` when there are no received purchase orders at all;
Price Stability defaults to `100` when there is no line data to compare.

**Implementation:** `procurementHealthScore` and its three components in
`src/lib/metrics/procurement.ts`.

---

## On-Time Shipment Rate (Logistics)

**Business definition:** The percentage of shipments (inbound and
outbound) that arrived on or before their expected delivery date.

**Formula:**

```
Eligible Shipments (trailing 90 days) =
  status == "delivered" AND actualDeliveryDate is set
  AND actualDeliveryDate ∈ (REFERENCE_DATE - 90, REFERENCE_DATE]

On-Time Shipment Rate = (count(actualDeliveryDate <= expectedDeliveryDate) / count(Eligible Shipments)) × 100
```

**Source data:** `Shipment[]`. Note `status == "delayed"` means *currently* overdue and not yet delivered — a live problem, not a completed outcome — so it is excluded from this rate; a shipment that arrived late is still `status == "delivered"`, with its lateness captured by `actualDeliveryDate > expectedDeliveryDate`.

**Time window:** Trailing 90 days.

**Edge case:** `null` when there are no eligible shipments in the window.

**Implementation:** `onTimeShipmentRate` in `src/lib/metrics/logistics.ts`.

---

## Logistics Health

**Business definition:** Session 1's initial logistics health score.

**Formula:**

```
Logistics Health = On-Time Shipment Rate  (0 when the rate is null)
```

Clamped to [0, 100]. This will expand in Session 5 (e.g. weighting inbound
vs. outbound separately).

**Implementation:** `logisticsHealthScore` in `src/lib/metrics/logistics.ts`.

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

**Implementation:** `capacityUtilization`, `capacityUtilizationScore`,
`inventoryIssueRateScore`, `warehouseHealthScore` in
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

**Implementation:** `overallHealthScore` in `src/lib/metrics/health.ts`,
composed in `getSupplyChainHealth()` in `src/data/repositories/dashboard.ts`.

### Inventory Health (component)

**Formula:**

```
Inventory Health = (count(SKUs where Safety Stock <= Available <= Overstock Threshold) / count(active SKU-warehouse pairs)) × 100
```

Clamped to [0, 100]. Only active products contribute.

**Example:** 150 active products stocked across warehouses produce 210
product-warehouse pairs; 178 of them sit within their healthy range →
Inventory Health = 178 / 210 × 100 = **84.8 → 85**.

**Implementation:** `inventoryHealthScore` in `src/lib/metrics/inventory.ts`.

---

## Trailing-Window Convention

Every "trailing 90-day" calculation in this document uses the same
inclusive/exclusive rule:

```
date ∈ (REFERENCE_DATE - 90 days, REFERENCE_DATE]
```

i.e. more than 90 days ago is excluded; exactly on `REFERENCE_DATE` is
included. Implemented once in `isWithinTrailingWindow()`
(`src/data/mock/dates.ts`) and reused everywhere so the window can never
drift between modules.
