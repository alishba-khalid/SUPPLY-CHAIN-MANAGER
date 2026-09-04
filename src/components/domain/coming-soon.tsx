import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/** For modules not built yet. Never references internal build/session language — that's implementation detail, not something a user should see. */
export function ComingSoon({ description }: { description: string }) {
  return (
    <div className="p-8">
      <EmptyState icon={<Construction size={18} />} title="Coming soon" description={description} />
    </div>
  );
}
