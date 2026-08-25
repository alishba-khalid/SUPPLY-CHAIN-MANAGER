import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// No Company entity is stored in this schema (see docs/metrics.md's scope note) —
// this is the fictional demo distributor the seed data represents.
const DEMO_COMPANY_NAME = "Northline Distribution Co.";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar companyName={DEMO_COMPANY_NAME} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
