/** Prints the current health score breakdown. Run after seeding or any data change. */
import "dotenv/config";
import { getSupplyChainHealth } from "../src/data/repositories/dashboard";

async function main() {
  const health = await getSupplyChainHealth();
  console.log("Health score breakdown:");
  console.log(`  Overall:     ${health.overall}`);
  console.log(`  Inventory:   ${health.inventory}`);
  console.log(`  Suppliers:   ${health.supplier}`);
  console.log(`  Procurement: ${health.procurement}`);
  console.log(`  Logistics:   ${health.logistics}`);
  console.log(`  Warehouses:  ${health.warehouse}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
