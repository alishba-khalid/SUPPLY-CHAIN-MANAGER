import type { Warehouse } from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";
import { isDuplicateKeyError, type InsertResult } from "@/lib/procurement/po-number";
import { getInventoryInsights } from "./inventory";
import {
  capacityUtilization,
  capacityUtilizationScore,
  averageWarehouseHealth,
  inventoryIssueRateScore,
  knownCapacity,
  utilizationBand,
  warehouseHealthScore,
  type UtilizationBand,
} from "@/lib/metrics/warehouse";

/** Capacity-derived fields are null when the warehouse's capacity is unknown. */
export interface WarehouseHealth {
  warehouseId: number;
  onHandUnits: number;
  capacityUnits: number | null;
  utilizationPercent: number | null;
  utilizationBand: UtilizationBand | null;
  utilizationScore: number | null;
  issueRateScore: number;
  healthScore: number | null;
}

export async function getWarehouses(orgId: string): Promise<Warehouse[]> {
  return prisma.warehouse.findMany({ where: { orgId }, orderBy: { id: "asc" } });
}

export async function getWarehouse(orgId: string, warehouseId: number): Promise<Warehouse | undefined> {
  const warehouse = await prisma.warehouse.findUnique({ where: { orgId_id: { orgId, id: warehouseId } } });
  return warehouse ?? undefined;
}

export async function getWarehouseHealth(orgId: string, warehouseId: number): Promise<WarehouseHealth | undefined> {
  const warehouse = await prisma.warehouse.findUnique({ where: { orgId_id: { orgId, id: warehouseId } } });
  if (!warehouse) return undefined;

  const onHandUnits = await prisma.inventory.aggregate({
    where: { orgId, warehouseId },
    _sum: { quantityOnHand: true },
  });
  const units = onHandUnits._sum.quantityOnHand ?? 0;

  const capacityUnits = knownCapacity(warehouse.capacityUnits);
  const rawUtilization = capacityUtilization(units, capacityUnits);
  const utilizationPercent = rawUtilization === null ? null : Math.round(rawUtilization * 10) / 10;
  const utilizationScore = utilizationPercent === null ? null : capacityUtilizationScore(utilizationPercent);

  const insights = (await getInventoryInsights(orgId)).filter((i) => i.warehouseId === warehouseId);
  const issueRateScore = inventoryIssueRateScore(insights);

  return {
    warehouseId,
    onHandUnits: units,
    capacityUnits,
    utilizationPercent,
    utilizationBand: utilizationPercent === null ? null : utilizationBand(utilizationPercent),
    utilizationScore,
    issueRateScore,
    healthScore: warehouseHealthScore(utilizationScore, issueRateScore),
  };
}

export async function getAllWarehouseHealth(orgId: string): Promise<WarehouseHealth[]> {
  const warehouses = await getWarehouses(orgId);
  const results = await Promise.all(warehouses.map((w) => getWarehouseHealth(orgId, w.id)));
  return results.filter((r): r is WarehouseHealth => !!r);
}

/** Null when no warehouse has a known capacity. */
export async function getWarehouseHealthScore(orgId: string): Promise<number | null> {
  const all = await getAllWarehouseHealth(orgId);
  return averageWarehouseHealth(all.map((w) => w.healthScore));
}

/**
 * Adds a warehouse. Never updates: a code that already exists in this
 * workspace is reported as a duplicate, so an existing warehouse is never
 * silently overwritten.
 */
export async function insertWarehouse(
  orgId: string,
  data: { code: string; name: string; capacityUnits: number | null },
): Promise<InsertResult<Warehouse>> {
  try {
    const row = await prisma.warehouse.create({ data: { orgId, ...data } });
    return { ok: true, value: row };
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false, duplicate: true };
    throw error;
  }
}
