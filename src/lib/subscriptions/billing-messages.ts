/**
 * What the Billing view says when checkout or the billing portal can't start.
 * The routes redirect back with ?billing_error=<code>&plan=<plan>; only these
 * fixed codes are shown, never text taken from the URL.
 */

import { PLAN_DEFINITIONS } from "@/lib/subscriptions/tiers";
import { isPlanTier } from "@/lib/subscriptions/write-access";

export const BILLING_ERROR_CODES = [
  "not-configured",
  "contact-us",
  "demo",
  "invalid-plan",
  "polar-error",
  "no-billing-account",
] as const;

export type BillingErrorCode = (typeof BILLING_ERROR_CODES)[number];

export function isBillingErrorCode(value: string): value is BillingErrorCode {
  return (BILLING_ERROR_CODES as readonly string[]).includes(value);
}

/** The message for a code; `plan` is the raw ?plan= value and is only used if it's a real plan. */
export function billingErrorMessage(code: BillingErrorCode, plan: string | null): string {
  const planName = plan !== null && isPlanTier(plan) ? PLAN_DEFINITIONS[plan].name : null;
  switch (code) {
    case "not-configured":
      return planName
        ? `Checkout isn't set up for the ${planName} plan yet. Nothing was charged.`
        : "Checkout isn't set up yet. Nothing was charged.";
    case "contact-us":
      return "Enterprise is priced with you directly. Contact us and we'll set it up.";
    case "demo":
      return "The live demo can't buy a plan. Sign up and create your organization first.";
    case "invalid-plan":
      return "That plan doesn't exist. Choose one of the plans below.";
    case "polar-error":
      return "Checkout couldn't start because the payment provider didn't respond. Nothing was charged. Please try again.";
    case "no-billing-account":
      return "This organization has no billing account yet. Choose a plan below to start one.";
  }
}
