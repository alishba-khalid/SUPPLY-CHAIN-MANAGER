import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getSeedData } from "@/data/mock/seed";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { company } = getSeedData();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar companyName={company.name} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
