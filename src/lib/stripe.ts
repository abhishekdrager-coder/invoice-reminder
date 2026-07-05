import Stripe from "stripe";

import { PLAN_CONFIG, type PlanId } from "@/config/plans";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2026-06-24.dahlia",
  typescript: true,
});

export const planLimits = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([plan, config]) => [
    plan,
    {
      invoiceLimit: config.invoiceLimit,
      reminderLimit: config.reminderLimit,
      aiRewriteLimit: config.aiRewriteLimit,
    },
  ]),
) as Record<PlanId, { invoiceLimit: number; reminderLimit: number; aiRewriteLimit: number }>;

export function getPlanFromPriceId(priceId?: string | null): PlanId {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}

export function getStripePriceId(plan: PlanId): string | undefined {
  return PLAN_CONFIG[plan].stripePriceId;
}
