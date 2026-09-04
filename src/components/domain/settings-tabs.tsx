"use client";

import { useState, ReactNode, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, Building2, ClipboardList, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsTabsProps {
  orgName: string;
  orgId: string;
  importer: ReactNode;
  billingView: ReactNode;
}

export function SettingsTabs({ orgName, orgId, importer, billingView }: SettingsTabsProps) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "import" | "billing" | "org") || "import";
  const [activeTab, setActiveTab] = useState<"import" | "billing" | "org">(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as "import" | "billing" | "org" | null;
    if (tabParam && (tabParam === "import" || tabParam === "billing" || tabParam === "org")) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-(--color-border)">
        <button
          onClick={() => setActiveTab("billing")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-body font-medium transition-colors border-b-2 -mb-[2px]",
            activeTab === "billing"
              ? "border-(--color-brand) text-(--color-brand)"
              : "border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)"
          )}
        >
          <CreditCard size={16} />
          Subscription & Billing
        </button>
        <button
          onClick={() => setActiveTab("import")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-body font-medium transition-colors border-b-2 -mb-[2px]",
            activeTab === "import"
              ? "border-(--color-brand) text-(--color-brand)"
              : "border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)"
          )}
        >
          <UploadCloud size={16} />
          Data Import
        </button>
        <button
          onClick={() => setActiveTab("org")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-body font-medium transition-colors border-b-2 -mb-[2px]",
            activeTab === "org"
              ? "border-(--color-brand) text-(--color-brand)"
              : "border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)"
          )}
        >
          <Building2 size={16} />
          Organization Profile
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "billing" ? (
        billingView
      ) : activeTab === "import" ? (
        <Card className="p-6">{importer}</Card>
      ) : (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-h3 font-semibold text-(--color-text-primary)">Active Workspace</h3>
            <p className="mt-1 text-body text-(--color-text-secondary)">
              Operational database records are isolated under this specific Clerk organization profile.
            </p>
          </div>

          <div className="grid gap-6 border-t border-(--color-border) pt-6 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-caption font-semibold uppercase tracking-wider text-(--color-text-muted)">
                Organization Name
              </p>
              <p className="text-body font-medium text-(--color-text-primary) flex items-center gap-2">
                <Building2 size={16} className="text-(--color-brand)" />
                {orgName}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-caption font-semibold uppercase tracking-wider text-(--color-text-muted)">
                Organization ID (Clerk)
              </p>
              <p className="text-body font-mono text-(--color-text-primary) flex items-center gap-2 select-all">
                {orgId}
                {orgId === "org_test_123" && (
                  <Badge tone="neutral">Development Mode</Badge>
                )}
              </p>
            </div>
          </div>

          <div className="border-t border-(--color-border) pt-6 space-y-4">
            <div className="flex gap-3">
              <div className="shrink-0 rounded-md bg-(--color-surface-secondary) p-2 h-10 w-10 flex items-center justify-center text-(--color-text-secondary)">
                <ClipboardList size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-(--color-text-primary)">Multi-Tenant Isolation Notice</h4>
                <p className="mt-1 text-small text-(--color-text-secondary) max-w-2xl leading-relaxed">
                  All transactions, products, suppliers, and warehouses created or imported are strictly isolated to your organization. Cross-tenant leakage is prevented at the database schema layer.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
