"use server";

import { requireOrgId, isDemoOrg } from "@/lib/auth";
import { getSupplyChainHealth, getDashboardAlerts } from "@/data/repositories/dashboard";
import { recordAiQueryUsage } from "@/data/repositories/subscription";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

const MAX_QUESTION_LENGTH = 300;

// Public demo safety caps. Independent of (and much tighter than) the
// per-plan-tier monthly quota shown in the UI, which is a product/billing
// simulation, not a security control — its counter is in-memory and not
// shared across serverless instances, so it cannot be trusted to actually
// stop abuse on a publicly reachable demo.
const DEMO_PER_IP_BURST_LIMIT = 5;
const DEMO_PER_IP_BURST_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const DEMO_PER_IP_DAILY_LIMIT = 20; // well below the Professional tier's 2,000/month
const DEMO_PER_IP_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEMO_GLOBAL_DAILY_LIMIT = 200; // hard ceiling across every visitor combined
const DEMO_GLOBAL_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

const QUOTA_EXHAUSTED_MESSAGE = "Demo AI quota reached for today — try again tomorrow.";
const RATE_LIMITED_MESSAGE = "You're sending requests too quickly — please wait a few minutes and try again.";

export interface AiManagerReply {
  success: boolean;
  reply?: string;
  recommendation?: string;
  suggestedAction?: { label: string; href: string };
  remaining: number;
  error?: string;
}

/**
 * Server-side answer generation for the AI Manager. Deliberately not an LLM
 * call — deterministic keyword matching grounded in this org's real data,
 * computed here (not trusted from the client) so a crafted request can't
 * feed it fabricated health/alerts to manipulate the reply. Moving this
 * server-side (it previously ran entirely in the browser) is what makes the
 * caps below actually enforceable rather than a client-side suggestion.
 */
export async function askAiManagerAction(rawQuestion: string): Promise<AiManagerReply> {
  const orgId = await requireOrgId();
  const question = (rawQuestion || "").trim().slice(0, MAX_QUESTION_LENGTH);

  if (!question) {
    return { success: false, error: "Ask a question first.", remaining: 0 };
  }

  if (isDemoOrg(orgId)) {
    const ip = await getRequestIp();

    const burst = await checkRateLimit(`ai:ip:${ip}:burst`, DEMO_PER_IP_BURST_LIMIT, DEMO_PER_IP_BURST_WINDOW_MS);
    if (!burst.allowed) {
      return { success: false, error: RATE_LIMITED_MESSAGE, remaining: 0 };
    }

    const perIpDaily = await checkRateLimit(`ai:ip:${ip}:daily`, DEMO_PER_IP_DAILY_LIMIT, DEMO_PER_IP_DAILY_WINDOW_MS);
    if (!perIpDaily.allowed) {
      return { success: false, error: QUOTA_EXHAUSTED_MESSAGE, remaining: 0 };
    }

    const globalDaily = await checkRateLimit("ai:demo:global:daily", DEMO_GLOBAL_DAILY_LIMIT, DEMO_GLOBAL_DAILY_WINDOW_MS);
    if (!globalDaily.allowed) {
      return { success: false, error: QUOTA_EXHAUSTED_MESSAGE, remaining: 0 };
    }
  }

  const usage = await recordAiQueryUsage(orgId);
  if (!usage.success) {
    return {
      success: false,
      error: `You have reached your monthly limit of AI queries. Upgrade your plan in Settings to continue querying.`,
      remaining: 0,
    };
  }

  const [health, alerts] = await Promise.all([getSupplyChainHealth(orgId), getDashboardAlerts(orgId)]);

  const lower = question.toLowerCase();
  let reply = "";
  let recommendation: string | undefined;
  let suggestedAction: { label: string; href: string } | undefined;

  if (lower.includes("stockout") || lower.includes("risk") || lower.includes("low")) {
    const stockouts = alerts.filter((a) => a.severity === "critical" || a.severity === "warning");
    reply = `There are currently ${stockouts.length} active inventory alerts requiring attention. The most urgent is ${stockouts[0]?.title || "none"}.`;
    recommendation = `Action: Issue purchase orders for positions with days until stockout lower than supplier lead times to avoid production halts.`;
    suggestedAction = { label: "View Low Stock in Inventory", href: "/dashboard/inventory?status=understock" };
  } else if (lower.includes("supplier") || lower.includes("otif") || lower.includes("delivery")) {
    reply = `Supplier score is currently ${health.supplier}/100 and Procurement score is ${health.procurement}/100 based on trailing 90-day purchase order receipts.`;
    recommendation = `Action: Investigate suppliers with sub-80% OTIF rates and adjust safety stock lead times accordingly.`;
    suggestedAction = { label: "Open Supplier Scorecards", href: "/dashboard/suppliers" };
  } else if (lower.includes("overstock") || lower.includes("capital") || lower.includes("tied up")) {
    const overstocks = alerts.filter((a) => a.title.includes("cover") && a.description.includes("tied up"));
    reply = `Found ${overstocks.length} overstock positions exceeding healthy holding thresholds. Overstock costs carry and ties up working capital.`;
    recommendation = `Action: Delay scheduled purchase orders for high-cover SKUs to liberate cash flow.`;
    suggestedAction = { label: "Review Overstock Inventory", href: "/dashboard/inventory?status=overstock" };
  } else {
    reply = `Analysis complete across all active facilities. System health is at ${health.overall}/100 with Inventory at ${health.inventory}/100 and Logistics at ${health.logistics}/100.`;
    recommendation = `Recommendation: Maintain weekly reorder reviews and monitor trailing lead times.`;
    suggestedAction = { label: "View Analytics Overview", href: "/dashboard/analytics" };
  }

  return { success: true, reply, recommendation, suggestedAction, remaining: usage.remaining };
}
