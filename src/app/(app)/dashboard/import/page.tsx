import { PageHeader } from "@/components/ui/page-header";
import { SmartImporter } from "@/components/domain/smart-importer/smart-importer";

// The smart importer (rendered here) commits large files in one database
// transaction via a server action — give it the full function budget.
export const maxDuration = 300;

export default function ImportPage() {
  return (
    <div>
      <PageHeader
        title="Import Data"
        description="Upload messy Excel spreadsheets or CSV files to auto-populate products, inventory levels, suppliers, and purchase orders."
      />
      <div className="p-8">
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
          <SmartImporter />
        </div>
      </div>
    </div>
  );
}
