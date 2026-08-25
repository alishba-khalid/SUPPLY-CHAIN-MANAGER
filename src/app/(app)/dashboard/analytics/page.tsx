import { PageHeader } from "@/components/ui/page-header";
import { SessionPlaceholder } from "@/components/domain/session-placeholder";

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" description="Trends across inventory, procurement, suppliers, and logistics." />
      <SessionPlaceholder
        session="Session 5"
        description="Trend charts drawn from the same centralized dataset — no separate analytics dataset."
      />
    </div>
  );
}
