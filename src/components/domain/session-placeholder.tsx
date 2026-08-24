import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function SessionPlaceholder({ session, description }: { session: string; description: string }) {
  return (
    <div className="p-8">
      <EmptyState
        icon={<Construction size={18} />}
        title={`Arriving in ${session}`}
        description={description}
      />
    </div>
  );
}
