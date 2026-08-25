import { PageHeader } from "@/components/ui/page-header";
import { SessionPlaceholder } from "@/components/domain/session-placeholder";

export default function SuppliersPage() {
  return (
    <div>
      <PageHeader title="Suppliers" description="Lead time, OTIF, and reliability by supplier." />
      <SessionPlaceholder
        session="Session 4"
        description="Supplier scorecards built on the trailing 90-day OTIF calculation already implemented in the metrics layer."
      />
    </div>
  );
}
