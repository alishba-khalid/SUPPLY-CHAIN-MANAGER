import { PageHeader } from "@/components/ui/page-header";
import { SessionPlaceholder } from "@/components/domain/session-placeholder";

export default function ProcurementPage() {
  return (
    <div>
      <PageHeader title="Procurement" description="Purchase orders, spend, and approvals." />
      <SessionPlaceholder
        session="Session 4"
        description="Purchase order tracking, spend analysis, and price variance — sourced from the same purchase order data used everywhere else."
      />
    </div>
  );
}
