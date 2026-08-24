import type { Warehouse } from "@/types/supply-chain";
import { getSeedData } from "@/data/mock/seed";
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
  warehouseId: string;
  onHandUnits: number;
  capacityUnits: number;
  utilizationPercent: number;
  utilizationBand: UtilizationBand;
  utilizationScore: number;
  issueRateScore: number;
  healthScore: number;
}

export async function getWarehouses(): Promise<Warehouse[]> {
  return getSeedData().warehouses;
}

export async function getWarehouse(warehouseId: string): Promise<Warehouse | undefined> {
  return getSeedData().warehouses.find((w) => w.id === warehouseId);
}

export async function getWarehouseHealth(warehouseId: string): Promise<WarehouseHealth | undefined> {
  const { warehouses, inventoryRecords } = getSeedData();
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  if (!warehouse) return undefined;

  const onHandUnits = inventoryRecords
    .filter((r) => r.warehouseId === warehouseId)
    .reduce((sum, r) => sum + r.quantityOnHand, 0);

  const utilizationPercent = Math.round(capacityUtilization(onHandUnits, warehouse.capacityUnits) * 10) / 10;
  const utilizationScore = capacityUtilizationScore(utilizationPercent);

  const insights = (await getInventoryInsights()).filter((i) => i.warehouseId === warehouseId);
  const issueRateScore = inventoryIssueRateScore(insights);

  return {
    warehouseId,
    onHandUnits,
    capacityUnits: warehouse.capacityUnits,
    utilizationPercent,
    utilizationBand: utilizationBand(utilizationPercent),
    utilizationScore,
    issueRateScore,
    healthScore: warehouseHealthScore(utilizationScore, issueRateScore),
  };
}

export async function getAllWarehouseHealth(): Promise<WarehouseHealth[]> {
  const { warehouses } = getSeedData();
  const results = await Promise.all(warehouses.map((w) => getWarehouseHealth(w.id)));
  return results.filter((r): r is WarehouseHealth => !!r);
}

export async function getWarehouseHealthScore(): Promise<number> {
  const all = await getAllWarehouseHealth();
  if (all.length === 0) return 0;
  return Math.round(all.reduce((s, w) => s + w.healthScore, 0) / all.length);
}
