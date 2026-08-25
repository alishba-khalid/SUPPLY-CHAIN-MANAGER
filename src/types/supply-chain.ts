/**
 * Centralized domain types for Supply Chain Manager.
 *
 * These types are the single source of truth for shape across the mock
 * data layer, the repository layer, and the UI. They are designed to map
 * cleanly to a future Supabase/PostgreSQL schema — field names here should
 * be treated as the eventual column names.
 */

export type ID = string;

export type ISODate = string; // "YYYY-MM-DD"
export type ISODateTime = string; // ISO 8601 timestamp

// ============================================================
// Core entities
// ============================================================

export interface Company {
  id: ID;
  name: string;
  timezone: string;
  createdAt: ISODateTime;
}

export type UserRole = "owner" | "admin" | "manager" | "viewer";

export interface User {
  id: ID;
  companyId: ID;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export type ProductCategory =
  | "raw_material"
  | "component"
  | "finished_good"
  | "packaging"
  | "mro"; // maintenance, repair, operations

export interface Product {
  id: ID;
  sku: string;
  name: string;
  category: ProductCategory;
  unitCost: number; // cost to acquire one unit, USD
  unitPrice: number; // sell price, USD (0 for non-resale items)
  primarySupplierId: ID;
  unitOfMeasure: string; // "each", "case", "kg", etc.
  active: boolean;
  createdAt: ISODateTime;
}

export interface Supplier {
  id: ID;
  name: string;
  country: string;
  leadTimeDays: number; // standard replenishment lead time
  paymentTerms: string; // e.g. "Net 30"
  contactName: string;
  contactEmail: string;
  active: boolean;
  createdAt: ISODateTime;
}

export type WarehouseType = "distribution_center" | "retail" | "fulfillment" | "cross_dock";

export interface Warehouse {
  id: ID;
  name: string;
  code: string;
  city: string;
  country: string;
  type: WarehouseType;
  capacityUnits: number; // max storage capacity, in units
  active: boolean;
}

// ============================================================
// Inventory
// ============================================================

export interface InventoryRecord {
  id: ID;
  productId: ID;
  warehouseId: ID;
  quantityOnHand: number;
  quantityReserved: number; // committed to open customer orders
  quantityAvailable: number; // onHand - reserved
  updatedAt: ISODateTime;
}

export type InventoryTransactionType =
  | "RECEIPT"
  | "SALE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT";

export interface InventoryTransaction {
  id: ID;
  productId: ID;
  warehouseId: ID;
  type: InventoryTransactionType;
  quantity: number; // always positive; direction implied by `type`
  date: ISODate;
  referenceId?: ID; // e.g. purchaseOrderId, customerOrderId
}

// ============================================================
// Customers & demand
// ============================================================

export interface Customer {
  id: ID;
  name: string;
  country: string;
  createdAt: ISODateTime;
}

export type CustomerOrderStatus = "open" | "fulfilled" | "cancelled";

export interface CustomerOrderLine {
  id: ID;
  customerOrderId: ID;
  productId: ID;
  quantity: number;
  unitPrice: number;
}

export interface CustomerOrder {
  id: ID;
  orderNumber: string;
  customerId: ID;
  warehouseId: ID;
  orderDate: ISODate;
  fulfilledDate?: ISODate;
  status: CustomerOrderStatus;
  lines: CustomerOrderLine[];
}

// ============================================================
// Procurement
// ============================================================

export type PurchaseOrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "partially_received"
  | "received"
  | "cancelled";

export interface PurchaseOrderLine {
  id: ID;
  purchaseOrderId: ID;
  productId: ID;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: ID;
  poNumber: string;
  supplierId: ID;
  warehouseId: ID;
  status: PurchaseOrderStatus;
  orderedDate: ISODate;
  expectedDeliveryDate: ISODate;
  actualDeliveryDate?: ISODate;
  purchaseOrderValue: number; // sum of line (orderedQuantity * unitCost)
  lines: PurchaseOrderLine[];
}

// ============================================================
// Logistics
// ============================================================

export type ShipmentStatus = "pending" | "in_transit" | "delivered" | "delayed" | "cancelled";

export type ShipmentDirection = "inbound" | "outbound";

export interface Shipment {
  id: ID;
  shipmentNumber: string;
  direction: ShipmentDirection;
  purchaseOrderId?: ID;
  customerOrderId?: ID;
  originWarehouseId?: ID;
  destinationWarehouseId?: ID;
  carrier: string;
  status: ShipmentStatus;
  shippedDate?: ISODate;
  expectedDeliveryDate: ISODate;
  actualDeliveryDate?: ISODate;
}

// ============================================================
// Derived / calculated (not stored — produced by the metrics layer)
// ============================================================

export interface SupplierPerformance {
  supplierId: ID;
  windowDays: number; // trailing window used, e.g. 90
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
  productId: ID;
  warehouseId: ID;
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
  | "supplier_review"
  | "logistics_review"
  | "warehouse_review";

export type RecommendationPriority = "low" | "medium" | "high" | "critical";

export interface Recommendation {
  id: ID;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  affectedProductIds?: ID[];
  affectedSupplierId?: ID;
  affectedWarehouseId?: ID;
  estimatedImpact?: string; // human-readable, e.g. "$28,400 tied up"
  createdAt: ISODateTime;
}

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertCategory =
  | "inventory"
  | "supplier"
  | "procurement"
  | "logistics"
  | "warehouse";

export interface SupplyChainAlert {
  id: ID;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  productId?: ID;
  supplierId?: ID;
  warehouseId?: ID;
  createdAt: ISODateTime;
}

export interface SupplyChainHealthBreakdown {
  overall: number; // 0-100
  inventory: number;
  supplier: number;
  procurement: number;
  logistics: number;
  warehouse: number;
}

// ============================================================
// Trends & activity (Session 2 — Overview)
// ============================================================

export interface TrendPoint {
  periodStart: ISODate; // start of the bucket, e.g. a week start
  label: string; // short display label, e.g. "Jul 27"
  value: number;
}

export type ActivityEventType =
  | "po_received"
  | "shipment_delayed"
  | "customer_order_fulfilled"
  | "inventory_adjustment";

export interface ActivityEvent {
  id: ID;
  type: ActivityEventType;
  date: ISODate;
  title: string;
  description: string;
  productId?: ID;
  supplierId?: ID;
  warehouseId?: ID;
}
