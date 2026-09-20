import { PageHeader } from "@/components/ui/page-header";
import { SmartImporter } from "@/components/domain/smart-importer/smart-importer";

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
