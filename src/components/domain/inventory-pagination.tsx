import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { buildQueryString } from "@/lib/url-params";
import { cn } from "@/lib/utils";

export function InventoryPagination({
  page,
  pageSize,
  totalMatching,
  currentParams,
}: {
  page: number;
  pageSize: number;
  totalMatching: number;
  currentParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));
  const start = totalMatching === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalMatching, page * pageSize);

  return (
    <div className="flex items-center justify-between text-small text-(--color-text-muted)">
      <span>
        {totalMatching === 0 ? "0 rows" : `${start.toLocaleString()}–${end.toLocaleString()} of ${totalMatching.toLocaleString()}`}
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={`?${buildQueryString(currentParams, { page: Math.max(1, page - 1) })}`}
          scroll={false}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
          aria-disabled={page <= 1}
        >
          Previous
        </Link>
        <span>
          Page {page} of {totalPages}
        </span>
        <Link
          href={`?${buildQueryString(currentParams, { page: Math.min(totalPages, page + 1) })}`}
          scroll={false}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), page >= totalPages && "pointer-events-none opacity-50")}
          aria-disabled={page >= totalPages}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
