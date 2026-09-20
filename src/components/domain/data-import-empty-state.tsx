import Link from "next/link";
import { UploadCloud, ArrowRight, FileSpreadsheet, CheckCircle2 } from "lucide-react";

interface DataImportEmptyStateProps {
  title?: string;
  description?: string;
}

export function DataImportEmptyState({
  title = "No supply chain data imported yet",
  description = "Upload your products, inventory levels, suppliers, and purchase orders via Excel or CSV spreadsheets to unlock live analytics, health metrics, demand forecasts, and automated recommendations.",
}: DataImportEmptyStateProps) {
  return (
    <div className="mx-auto max-w-2xl py-12 px-4">
      <div className="flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-(--color-border) bg-(--color-surface) p-8 sm:p-12 shadow-xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-(--color-brand-subtle) text-(--color-brand) mb-6">
          <UploadCloud size={32} />
        </div>

        <h2 className="text-h2 font-bold text-(--color-text-primary) tracking-tight">
          {title}
        </h2>
        
        <p className="mt-3 text-body text-(--color-text-secondary) max-w-lg leading-relaxed">
          {description}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/dashboard/import"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-(--color-brand) px-6 py-3 text-body font-semibold text-white shadow-sm hover:bg-(--color-brand-hover) transition-colors w-full sm:w-auto"
          >
            <FileSpreadsheet size={18} />
            Import Your Data
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-(--color-border) pt-6 text-left w-full">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-(--color-brand) shrink-0 mt-0.5" />
            <span className="text-caption text-(--color-text-muted)">Supports CSV & Excel (.xlsx) formats</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-(--color-brand) shrink-0 mt-0.5" />
            <span className="text-caption text-(--color-text-muted)">Automatic column header mapping</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-(--color-brand) shrink-0 mt-0.5" />
            <span className="text-caption text-(--color-text-muted)">Instant score & forecast generation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
