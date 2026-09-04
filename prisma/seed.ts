import "dotenv/config";
import { seedCanonicalData } from "./seed-canonical";

function parseOrgId(): string {
  const flagIndex = process.argv.indexOf("--org");
  return flagIndex !== -1 && process.argv[flagIndex + 1] ? process.argv[flagIndex + 1] : "org_demo";
}

const ORG_ID = parseOrgId();

seedCanonicalData(ORG_ID)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
