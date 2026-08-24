import type { Customer, CustomerOrder } from "@/types/supply-chain";
import { getSeedData } from "@/data/mock/seed";

export async function getCustomers(): Promise<Customer[]> {
  return getSeedData().customers;
}

export async function getCustomerOrders(): Promise<CustomerOrder[]> {
  return getSeedData().customerOrders;
}

export async function getOpenCustomerOrders(): Promise<CustomerOrder[]> {
  return getSeedData().customerOrders.filter((o) => o.status === "open");
}
