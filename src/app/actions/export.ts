"use server";

import { requireOrgId } from "@/lib/auth";
import { getInventoryTable } from "@/data/repositories/inventory";
import type { InventoryRowStatus, InventoryTableRow, InventoryTableSortKey } from "@/types/supply-chain";

// The inventory table is paginated on the server, so its Excel export asks
// for every row matching the current filters. Capped so one click can't
// pull an unbounded result set.
const EXPORT_ROW_CAP = 50_000;

const SORT_KEYS: InventoryTableSortKey[] = ["status", "sku", "name", "warehouse", "onHand", "daysOfStock", "reorderPoint"];
const STATUSES: InventoryRowStatus[] = ["understock", "overstock", "healthy", "dead_stock", "unknown"];

export interface InventoryExportFilters {
  warehouseId?: number;
  status?: string;
  abcClass?: string;
  supplierId?: string;
  search?: string;
  sortKey?: string;
  sortDir?: string;
}

export async function exportInventoryAction(
  filters: InventoryExportFilters,
): Promise<{ rows: InventoryTableRow[]; truncated: boolean }> {
  const orgId = await requireOrgId();
  // Same checks as the inventory page: anything unexpected is ignored.
  const warehouseId =
    Number.isSafeInteger(filters.warehouseId) && (filters.warehouseId as number) >= 1 ? filters.warehouseId : undefined;
  const status = STATUSES.includes(filters.status as InventoryRowStatus) ? (filters.status as InventoryRowStatus) : undefined;
  const abcClass = filters.abcClass === "A" || filters.abcClass === "B" || filters.abcClass === "C" ? filters.abcClass : undefined;
  const sortKey = SORT_KEYS.includes(filters.sortKey as InventoryTableSortKey) ? (filters.sortKey as InventoryTableSortKey) : "status";

  const table = await getInventoryTable(orgId, {
    warehouseId,
    status,
    abcClass,
    supplierId: filters.supplierId || undefined,
    search: filters.search || undefined,
    sortKey,
    sortDir: filters.sortDir === "desc" ? "desc" : "asc",
    page: 1,
    pageSize: EXPORT_ROW_CAP,
  });
  return { rows: table.rows, truncated: table.totalMatching > table.rows.length };
}
