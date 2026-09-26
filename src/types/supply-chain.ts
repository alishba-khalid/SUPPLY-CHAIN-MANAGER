/**
 * Centralized domain types for Supply Chain Manager.
 *
 * These mirror the Postgres schema (`prisma/schema.prisma`) exactly — this
 * is the shape the repository layer maps Prisma rows into, and the shape
 * the metrics/insights layers consume. Business-facing codes (`sku`,
 * `supplierId`) are the join keys, matching the database.
 *
 * Scope note: this schema has no customer-order or shipment concept (see
 * docs/metrics.md's "Schema scope" section) — logistics is derived from
 * inbound purchase-order receipt timing instead.
 */

export type ISODate = string; // "YYYY-MM-DD"
export type ISODateTime = string; // ISO 8601 timestamp

// ============================================================
// Core entities
// ============================================================

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  capacityUnits: number | null; // null = unknown — never substitute a number
}

export interface Supplier {
  id: number;
  supplierId: string; // business-facing code, e.g. "SUP-001"
  name: string;
  leadTimeDays: number;
  /** True only when the source data had no lead time and this defaulted to 14 — not true just because leadTimeDays === 14. */
  leadTimeMissing: boolean;
  email: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unitCost: number;
  supplierId: string;
}

// ============================================================
// Inventory
// ============================================================

export interface InventoryRecord {
  id: number;
  sku: string;
  warehouseId: number;
  quantityOnHand: number;
}

export type TransactionDirection = "IN" | "OUT";

export interface InventoryTransaction {
  id: number;
  sku: string;
  warehouseId: number;
  quantity: number;
  direction: TransactionDirection;
  date: ISODate;
}

// ============================================================
// Procurement
// ============================================================

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  orderDate: ISODate;
  expectedDate: ISODate;
  receivedDate: ISODate | null;
}

// ============================================================
// Derived / calculated (not stored — produced by the metrics layer)
// ============================================================

export interface SupplierPerformance {
  supplierId: string;
  windowDays: number;
  eligiblePurchaseOrders: number;
  onTimeInFullCount: number;
  otifPercent: number | null; // null when no eligible POs
  averageLeadTimeDays: number | null;
  totalSpend: number;
}

export type InventoryStatus =
  | "healthy"
  | "low_stock"
  | "stock_out_risk"
  | "overstock"
  | "slow_moving"
  | "dead_stock";

export interface InventoryInsight {
  sku: string;
  warehouseId: number;
  availableQuantity: number;
  averageDailyDemand: number | null; // null => insufficient demand data
  daysOfStock: number | null; // null when averageDailyDemand is null/0
  safetyStock: number;
  reorderPoint: number;
  overstockThreshold: number;
  status: InventoryStatus;
}

export type RecommendationCategory =
  | "reorder"
  | "reduce_purchase"
  | "expedite"
  | "transfer"
  | "supplier_review"
  | "logistics_review"
  | "warehouse_review";

export type RecommendationPriority = "low" | "medium" | "high" | "critical";

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  affectedSkus?: string[];
  affectedSupplierId?: string;
  affectedWarehouseId?: number;
  estimatedImpact?: string; // human-readable, e.g. "$28,400 tied up"
  createdAt: ISODateTime;
}

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertCategory = "inventory" | "supplier" | "procurement" | "logistics" | "warehouse";

export interface SupplyChainAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  sku?: string;
  supplierId?: string;
  warehouseId?: number;
  teaser?: string;
  suggestedQuantity?: number;
  estimatedCost?: number;
  /** Destination page for "why is this low / what do I do" — rendered as a CTA on the alert card. */
  link?: { href: string; label: string };
  createdAt: ISODateTime;
}

export interface SupplyChainHealthBreakdown {
  overall: number; // 0-100
  inventory: number;
  supplier: number;
  procurement: number;
  logistics: number;
  warehouse: number | null; // null = no warehouse has a known capacity
}

// ============================================================
// Trends & activity (Overview)
// ============================================================

export interface TrendPoint {
  periodStart: ISODate; // start of the bucket, e.g. a week start
  label: string; // short display label, e.g. "Jul 27"
  value: number;
}

export type ActivityEventType = "po_received" | "inventory_movement";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  date: ISODate;
  title: string;
  description: string;
  sku?: string;
  supplierId?: string;
  warehouseId?: number;
}

// ============================================================
// Inventory Table (paginated, query-side — see docs/metrics.md)
// ============================================================

/**
 * Distinct from `InventoryStatus` above, which drives the Overview health
 * score/alerts. This is the simpler, page-specific classification named in
 * the Inventory page's own spec — see docs/metrics.md's "Inventory Table"
 * section for exactly how each value is decided, including the two edge
 * cases (`dead_stock` for no/zero demand, `unknown` for a missing supplier
 * lead time) that aren't literal reads of a single formula.
 */
export type InventoryRowStatus = "understock" | "overstock" | "healthy" | "dead_stock" | "unknown";

export type AbcClass = "A" | "B" | "C" | null;

export interface InventoryTableRow {
  sku: string;
  productName: string;
  category: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  supplierId: string | null;
  supplierName: string | null;
  quantityOnHand: number;
  unitCost: number;
  leadTimeDays: number | null; // null => no supplier on record, or supplier has no lead time
  daysOfHistory: number; // 0..90 — how much trailing history this row's demand figure is based on
  avgDailyDemand: number | null; // null => no transaction history at all
  daysOfStock: number | null; // null when avgDailyDemand is null or 0 (would be infinite)
  safetyStock: number | null;
  reorderPoint: number | null;
  status: InventoryRowStatus;
  abcClass: AbcClass;
}

export interface InventoryTableSummary {
  totalRows: number;
  understockCount: number;
  overstockCount: number;
  deadStockCount: number;
}

export interface InventoryTableFilters {
  warehouseId?: number;
  status?: InventoryRowStatus;
  abcClass?: "A" | "B" | "C";
  supplierId?: string;
  search?: string;
}

export type InventoryTableSortKey =
  | "status"
  | "sku"
  | "name"
  | "warehouse"
  | "onHand"
  | "daysOfStock"
  | "reorderPoint";

export interface InventoryTableParams extends InventoryTableFilters {
  sortKey?: InventoryTableSortKey;
  sortDir?: "asc" | "desc";
  page?: number; // 1-indexed
  pageSize?: number;
}

export interface InventoryTableResult {
  rows: InventoryTableRow[];
  totalMatching: number; // rows matching current filters, across all pages
  summary: InventoryTableSummary; // unfiltered totals, for the four summary cards
  hasAnyTransactionHistory: boolean; // false => show the "import your data" empty state
}
