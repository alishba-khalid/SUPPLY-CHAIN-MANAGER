import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SmartImporter } from "@/components/domain/smart-importer/smart-importer";
import { WriteGate } from "@/components/domain/billing-coming-soon";
import { SettingsTabs } from "@/components/domain/settings-tabs";
import { BillingView } from "@/components/domain/billing-view";
import { LoadingState } from "@/components/ui/loading-state";
import { getOrgSubscription, getOrgQuotaUsage } from "@/data/repositories/subscription";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isDemoOrg, requireOrgId } from "@/lib/auth";
import { EmailAlertsSettings } from "@/components/domain/email-alerts-settings";
import { getEmailAlertSettingsAction } from "@/app/actions/integrations";

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

  // Billing always uses the session's org (or the demo org), never a
  // placeholder id, so the plan shown is the one checkout would change.
  const billingOrgId = await requireOrgId();
  const billingOrgName = isDemoOrg(billingOrgId) ? null : orgName;
  const [subscription, quota, emailAlerts] = await Promise.all([
    getOrgSubscription(billingOrgId),
    getOrgQuotaUsage(billingOrgId),
    getEmailAlertSettingsAction(),
  ]);

  return (
    <div>
      <PageHeader title="Settings" description="Manage subscription tiers and organization profile." />
      <div className="p-8">
        <Suspense fallback={<LoadingState message="Loading workspace settings..." />}>
          <SettingsTabs
            orgName={orgName}
            orgId={activeOrgId}
            importer={
              <WriteGate>
                <SmartImporter />
              </WriteGate>
            }
            billingView={<BillingView subscription={subscription} quota={quota} orgName={billingOrgName} />}
            alertsView={<EmailAlertsSettings initial={emailAlerts.settings} available={emailAlerts.available} />}
          />
        </Suspense>
      </div>
    </div>
  );
}
