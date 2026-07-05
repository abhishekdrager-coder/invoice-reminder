import Stripe from "stripe";

import { PLAN_CONFIG, type PlanId } from "@/config/plans";

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    const client = getStripeClient();
    if (!client) {
      throw new Error("Stripe is not configured.");
    }

    const value = Reflect.get(client as object, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
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
