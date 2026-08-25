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

export async function getWarehouses(): Promise<Warehouse[]> {
  return prisma.warehouse.findMany({ orderBy: { id: "asc" } });
}

export async function getWarehouse(warehouseId: number): Promise<Warehouse | undefined> {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  return warehouse ?? undefined;
}

export async function getWarehouseHealth(warehouseId: number): Promise<WarehouseHealth | undefined> {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) return undefined;

  const onHandUnits = await prisma.inventory.aggregate({
    where: { warehouseId },
    _sum: { quantityOnHand: true },
  });
  const units = onHandUnits._sum.quantityOnHand ?? 0;

  const utilizationPercent = Math.round(capacityUtilization(units, warehouse.capacityUnits) * 10) / 10;
  const utilizationScore = capacityUtilizationScore(utilizationPercent);

  const insights = (await getInventoryInsights()).filter((i) => i.warehouseId === warehouseId);
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

export async function getAllWarehouseHealth(): Promise<WarehouseHealth[]> {
  const warehouses = await getWarehouses();
  const results = await Promise.all(warehouses.map((w) => getWarehouseHealth(w.id)));
  return results.filter((r): r is WarehouseHealth => !!r);
}

export async function getWarehouseHealthScore(): Promise<number> {
  const all = await getAllWarehouseHealth();
  if (all.length === 0) return 0;
  return Math.round(all.reduce((s, w) => s + w.healthScore, 0) / all.length);
}
