export type PlanId = "free" | "starter" | "pro";

export type PlanConfig = {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number;
  invoiceLimit: number;
  reminderLimit: number;
  aiRewriteLimit: number;
  features: string[];
  stripePriceId?: string;
};

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "For freelancers testing automated invoice reminders.",
    priceMonthly: 0,
    invoiceLimit: 10,
    reminderLimit: 25,
    aiRewriteLimit: 20,
    features: ["Up to 10 invoices", "25 reminders / month", "1 reminder sequence"],
    stripePriceId: process.env.STRIPE_FREE_PRICE_ID,
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For solo operators that need dependable follow-ups.",
    priceMonthly: 19,
    invoiceLimit: 100,
    reminderLimit: 500,
    aiRewriteLimit: 250,
    features: ["Up to 100 invoices", "500 reminders / month", "AI tone rewriting"],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For finance teams scaling collections and visibility.",
    priceMonthly: 49,
    invoiceLimit: 1000,
    reminderLimit: 5000,
    aiRewriteLimit: 2000,
    features: ["Up to 1,000 invoices", "5,000 reminders / month", "Priority support"],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro"];
