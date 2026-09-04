import type { Warehouse } from "@/types/supply-chain";
import { prisma } from "@/lib/prisma";
import { getInventoryInsights } from "./inventory";
import {
  capacityUtilization,
  capacityUtilizationScore,
  inventoryIssueRateScore,
  utilizationBand,
  warehouseHealthScore,
  type UtilizationBand,
} from "@/lib/metrics/warehouse";

export interface WarehouseHealth {
  warehouseId: number;
  onHandUnits: number;
  capacityUnits: number;
  utilizationPercent: number;
  utilizationBand: UtilizationBand;
  utilizationScore: number;
  issueRateScore: number;
  healthScore: number;
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

  const utilizationPercent = Math.round(capacityUtilization(units, warehouse.capacityUnits) * 10) / 10;
  const utilizationScore = capacityUtilizationScore(utilizationPercent);

  const insights = (await getInventoryInsights(orgId)).filter((i) => i.warehouseId === warehouseId);
  const issueRateScore = inventoryIssueRateScore(insights);

  return {
    warehouseId,
    onHandUnits: units,
    capacityUnits: warehouse.capacityUnits,
    utilizationPercent,
    utilizationBand: utilizationBand(utilizationPercent),
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

export async function getWarehouseHealthScore(orgId: string): Promise<number> {
  const all = await getAllWarehouseHealth(orgId);
  if (all.length === 0) return 0;
  return Math.round(all.reduce((s, w) => s + w.healthScore, 0) / all.length);
}
