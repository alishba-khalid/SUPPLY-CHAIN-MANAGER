import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { Supplier } from "@/types/supply-chain";

export function LeadTimeWarningBanner({
  suppliers = [],
  className = "",
}: {
  suppliers?: Supplier[];
  className?: string;
}) {
  // Check if any supplier has default 14-day lead time
  const unconfiguredSuppliers = suppliers.filter((s) => s.leadTimeDays === 14);

  if (unconfiguredSuppliers.length === 0) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <p className="text-small font-semibold">
            {unconfiguredSuppliers.length} supplier{unconfiguredSuppliers.length > 1 ? "s" : ""} imported with default 14-day lead times
          </p>
          <p className="text-caption text-amber-700/80 dark:text-amber-400/80">
            Safety stock and reorder point calculations will be estimated until accurate vendor lead times are configured.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/suppliers"
        className="inline-flex items-center gap-1 text-caption font-semibold bg-amber-600 text-white hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
      >
        Configure Suppliers <ArrowRight size={13} />
      </Link>
    </div>
  );
}
