import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL, max: 5 });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Wiping all records from database...");
  await prisma.transaction.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.warehouse.deleteMany({});
  console.log("All demo data removed successfully. Database is now completely clean.");
}

main()
  .catch((e) => {
    console.error("Clean failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
