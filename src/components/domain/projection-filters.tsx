"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Supplier, Warehouse } from "@/types/supply-chain";

const ABC_OPTIONS = [
  { value: "", label: "All ABC classes" },
  { value: "A", label: "A — top demand value" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
] as const;

const XYZ_OPTIONS = [
  { value: "", label: "All XYZ classes" },
  { value: "X", label: "X — steady demand" },
  { value: "Y", label: "Y — variable demand" },
  { value: "Z", label: "Z — erratic / intermittent" },
] as const;

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "expedite", label: "Expedite" },
  { value: "transfer", label: "Transfer" },
  { value: "reorder", label: "Reorder" },
  { value: "covered", label: "Covered" },
] as const;

const selectClass =
  "h-9 rounded-md border border-(--color-border) bg-(--color-surface) px-3 text-body text-(--color-text-primary)";

export function ProjectionFilters({ warehouses, suppliers }: { warehouses: Warehouse[]; suppliers: Supplier[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
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

      <select className={selectClass} value={searchParams.get("abcClass") ?? ""} onChange={(e) => setParam("abcClass", e.target.value)}>
        {ABC_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select className={selectClass} value={searchParams.get("xyzClass") ?? ""} onChange={(e) => setParam("xyzClass", e.target.value)}>
        {XYZ_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select className={selectClass} value={searchParams.get("action") ?? ""} onChange={(e) => setParam("action", e.target.value)}>
        {ACTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
