import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { Sparkles, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const orgId = await requireOrgId();
  const isDemo = isDemoOrg(orgId);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {isDemo && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-caption font-medium text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 shrink-0">
          <Sparkles size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Demo mode — actions are simulated and not saved. Everyone sees the same data.
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-700/80 dark:text-amber-300/80 ml-2">
            <ShieldCheck size={13} /> Canonical data protected
          </span>
        </div>
      )}
      <div className="flex min-h-0 flex-1 w-full overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar isDemo={isDemo} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
