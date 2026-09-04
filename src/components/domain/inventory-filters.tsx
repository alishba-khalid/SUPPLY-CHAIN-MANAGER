"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import type { Supplier, Warehouse } from "@/types/supply-chain";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "understock", label: "Understock" },
  { value: "overstock", label: "Overstock" },
  { value: "healthy", label: "Healthy" },
  { value: "dead_stock", label: "Dead Stock" },
  { value: "unknown", label: "Unknown" },
] as const;

const ABC_OPTIONS = [
  { value: "", label: "All ABC classes" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
] as const;

const selectClass =
  "h-9 rounded-md border border-(--color-border) bg-(--color-surface) px-3 text-body text-(--color-text-primary)";

export function InventoryFilters({ warehouses, suppliers }: { warehouses: Warehouse[]; suppliers: Supplier[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page"); // any filter change starts back at page 1
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParam("search", search);
        }}
        className="flex items-center"
      >
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or name…"
            className="h-9 w-56 rounded-md border border-(--color-border) bg-(--color-surface) pl-8 pr-3 text-body text-(--color-text-primary) placeholder:text-(--color-text-muted)"
          />
        </div>
      </form>

      <select
        className={selectClass}
        value={searchParams.get("warehouseId") ?? ""}
        onChange={(e) => setParam("warehouseId", e.target.value)}
      >
        <option value="">All warehouses</option>
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.code}
          </option>
        ))}
      </select>

      <select className={selectClass} value={searchParams.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select className={selectClass} value={searchParams.get("abcClass") ?? ""} onChange={(e) => setParam("abcClass", e.target.value)}>
        {ABC_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("supplierId") ?? ""}
        onChange={(e) => setParam("supplierId", e.target.value)}
      >
        <option value="">All suppliers</option>
        {suppliers.map((s) => (
          <option key={s.supplierId} value={s.supplierId}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
