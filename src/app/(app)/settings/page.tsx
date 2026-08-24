import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Company, users, and integration preferences." />
      <div className="p-8">
        <EmptyState icon={<Settings size={18} />} title="Settings are not configurable yet." />
      </div>
    </div>
  );
}
