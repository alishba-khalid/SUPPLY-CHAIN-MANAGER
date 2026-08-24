import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UserCircle } from "lucide-react";

export default function ProfilePage() {
  return (
    <div>
      <PageHeader title="Profile" description="Your account details." />
      <div className="p-8">
        <EmptyState icon={<UserCircle size={18} />} title="Authentication isn't wired up yet." />
      </div>
    </div>
  );
}
