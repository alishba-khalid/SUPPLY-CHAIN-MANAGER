/**
 * Single source of truth for "does this open PO's quantity count as real,
 * available/pipeline inventory." An open PO whose expected date has passed
 * without being received is overdue — the supplier missed the date, so
 * there is no evidence the units are actually in transit. Every cover-days
 * or reorder-quantity computation (alerts, the stockout projection chart,
 * SKU detail, suggested-PO recommendations) must exclude that PO's
 * quantity via this function rather than summing PO quantities on its own,
 * so an alert can never claim stock is "in transit" while the same page
 * flags the linked PO as overdue.
 */
import type { PurchaseOrder } from "@/types/supply-chain";
import { daysBetween, todayISODate } from "@/lib/dates";

export function isPoOverdue(po: Pick<PurchaseOrder, "expectedDate" | "receivedDate">, today: string = todayISODate()): boolean {
  return po.receivedDate === null && po.expectedDate < today;
}

export interface ExcludedOverduePo {
  poNumber: string;
  supplierId: string;
  quantity: number;
  expectedDate: string;
  daysOverdue: number;
}

export interface EffectivePipelineResult {
  /** Open POs still genuinely in transit (not received, not overdue) — safe to credit as available/pipeline inventory. */
  effectivePos: PurchaseOrder[];
  /** Sum of quantity across effectivePos. */
  effectiveQuantity: number;
  /** Open POs excluded because they are overdue and not received — never credited toward cover-days or reorder math. */
  excludedOverduePos: ExcludedOverduePo[];
}

/**
 * Splits a SKU's open purchase orders into inventory that can genuinely be
 * relied upon (not yet overdue) vs. overdue POs that must be excluded from
 * available/pipeline inventory used in cover-days and reorder math.
 */
export function splitEffectivePipeline(
  openPOs: PurchaseOrder[],
  today: string = todayISODate(),
): EffectivePipelineResult {
  const effectivePos: PurchaseOrder[] = [];
  const excludedOverduePos: ExcludedOverduePo[] = [];

  for (const po of openPOs) {
    if (po.receivedDate !== null) continue;
    if (isPoOverdue(po, today)) {
      excludedOverduePos.push({
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        quantity: po.quantity,
        expectedDate: po.expectedDate,
        daysOverdue: Math.max(1, daysBetween(po.expectedDate, today)),
      });
    } else {
      effectivePos.push(po);
    }
  }

  const effectiveQuantity = effectivePos.reduce((sum, po) => sum + po.quantity, 0);
  return { effectivePos, effectiveQuantity, excludedOverduePos };
}
