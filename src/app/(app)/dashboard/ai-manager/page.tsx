import { PageHeader } from "@/components/ui/page-header";
import { AIManagerView } from "@/components/domain/ai-manager-view";
import { requireOrgId } from "@/lib/auth";
import { getSupplyChainHealth, getDashboardAlerts } from "@/data/repositories/dashboard";
import { getOrgSubscription, getOrgQuotaUsage } from "@/data/repositories/subscription";

export default async function AIManagerPage() {
  const orgId = await requireOrgId();

  const [health, alerts, subscription, quota] = await Promise.all([
    getSupplyChainHealth(orgId),
    getDashboardAlerts(orgId),
    getOrgSubscription(orgId),
    getOrgQuotaUsage(orgId),
  ]);

  return (
    <div>
      <PageHeader
        title="AI Manager"
        description="Deterministic conversational intelligence grounded in your operational supply chain data."
      />
      <div className="p-8">
        <AIManagerView
          subscription={subscription}
          quota={quota}
          health={health}
          alerts={alerts}
        />
      </div>
    </div>
  );
}
