import { PageHeader } from "@/components/ui/page-header";
import { SessionPlaceholder } from "@/components/domain/session-placeholder";

export default function LogisticsPage() {
  return (
    <div>
      <PageHeader title="Logistics" description="Shipments, delays, and on-time performance." />
      <SessionPlaceholder
        session="Session 5"
        description="Inbound and outbound shipment tracking with on-time rate, already computed by the logistics metrics module."
      />
    </div>
  );
}
