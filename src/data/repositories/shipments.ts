import type { Shipment } from "@/types/supply-chain";
import { getSeedData } from "@/data/mock/seed";
import { logisticsHealthScore, onTimeShipmentRate } from "@/lib/metrics/logistics";

export async function getShipments(): Promise<Shipment[]> {
  return getSeedData().shipments;
}

export async function getShipment(shipmentId: string): Promise<Shipment | undefined> {
  return getSeedData().shipments.find((s) => s.id === shipmentId);
}

export async function getDelayedShipments(): Promise<Shipment[]> {
  return getSeedData().shipments.filter((s) => s.status === "delayed" || s.status === "in_transit");
}

export async function getOnTimeShipmentRate(): Promise<number | null> {
  return onTimeShipmentRate(getSeedData().shipments);
}

export async function getLogisticsHealthScore(): Promise<number> {
  return logisticsHealthScore(getSeedData().shipments);
}
