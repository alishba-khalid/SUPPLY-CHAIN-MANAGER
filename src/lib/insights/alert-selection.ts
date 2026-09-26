/**
 * Picks which alerts the Overview shows before "Show all". Alerts arrive in
 * rank order (health first, then stockouts, overdue POs, low stock, demand
 * spikes, overstock, supplier). Ranking alone fills a short list with one
 * type — e.g. 25 stockouts push every overdue PO, low-stock, spike and
 * supplier alert far out of view — so each group present gets at least one
 * slot, and the rest are filled in rank order. The result stays in rank order.
 */
import type { SupplyChainAlert } from "@/types/supply-chain";

export function selectTopAlerts(alerts: SupplyChainAlert[], limit: number): SupplyChainAlert[] {
  if (alerts.length <= limit) return alerts;

  const picked = new Set<SupplyChainAlert>();
  // 1. The highest-ranked alert of each group (alerts without a group get no reserved slot).
  const seenGroups = new Set<string>();
  for (const alert of alerts) {
    if (picked.size >= limit) break;
    if (alert.group && !seenGroups.has(alert.group)) {
      seenGroups.add(alert.group);
      picked.add(alert);
    }
  }
  // 2. Fill the remaining slots in rank order.
  for (const alert of alerts) {
    if (picked.size >= limit) break;
    picked.add(alert);
  }
  return alerts.filter((alert) => picked.has(alert));
}
