import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SmartImporter } from "@/components/domain/smart-importer/smart-importer";
import { SettingsTabs } from "@/components/domain/settings-tabs";
import { BillingView } from "@/components/domain/billing-view";
import { LoadingState } from "@/components/ui/loading-state";
import { getOrgSubscription, getOrgQuotaUsage } from "@/data/repositories/subscription";
import { auth, clerkClient } from "@clerk/nextjs/server";

// The smart importer (rendered here) commits large files in one database
// transaction via a server action — give it the full function budget.
export const maxDuration = 300;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  if (params?.tab === "import") {
    redirect("/dashboard/import");
  }

  const { orgId } = await auth();
  let orgName = "Test Organization";
  const activeOrgId = orgId || "org_test_123";

  if (orgId) {
    try {
      const clerk = await clerkClient();
      const org = await clerk.organizations.getOrganization({ organizationId: orgId });
      orgName = org.name;
    } catch (e) {
      console.error("Failed to load Clerk organization name:", e);
    }
  } else if (activeOrgId === "org_test_123") {
    orgName = "Development Mock Workspace";
  }

  const [subscription, quota] = await Promise.all([
    getOrgSubscription(activeOrgId),
    getOrgQuotaUsage(activeOrgId),
  ]);

  return (
    <div>
      <PageHeader title="Settings" description="Manage subscription tiers and organization profile." />
      <div className="p-8">
        <Suspense fallback={<LoadingState message="Loading workspace settings..." />}>
          <SettingsTabs
            orgName={orgName}
            orgId={activeOrgId}
            importer={<SmartImporter />}
            billingView={<BillingView subscription={subscription} quota={quota} />}
          />
        </Suspense>
      </div>
    </div>
  );
}
