import { PageHeader } from "@/components/ui/page-header";
import { SessionPlaceholder } from "@/components/domain/session-placeholder";

export default function InventoryPage() {
  return (
    <div>
      <PageHeader title="Inventory" description="Stock health, demand, and reorder signals across every warehouse." />
      <SessionPlaceholder
        session="Session 3"
        description="Inventory health, days of stock, safety stock, reorder points, and ABC analysis — backed by the repository layer already built in Session 1."
      />
    </div>
  );
}
