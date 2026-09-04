/** Prints the current health score breakdown for one org. Run after seeding or any data change. */
import "dotenv/config";
import { getSupplyChainHealth } from "../src/data/repositories/dashboard";

function parseOrgId(): string {
  const flagIndex = process.argv.indexOf("--org");
  const orgId = flagIndex !== -1 ? process.argv[flagIndex + 1] : undefined;
  if (!orgId) {
    console.error("Usage: tsx prisma/health-check.ts --org <clerkOrgId>");
    process.exit(1);
  }
  return orgId;
}

async function main() {
  const orgId = parseOrgId();
  const health = await getSupplyChainHealth(orgId);
  console.log(`Health score breakdown (org ${orgId}):`);
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
