import { PLAN_LIMITS, normalizePlan } from "@/lib/plans";

export function resolveEntitlements(planInput: string | null | undefined) {
  const plan = normalizePlan(planInput);
  const limits = PLAN_LIMITS[plan];

  return {
    plan,
    maxActiveInvoices: limits.activeInvoices,
    maxRemindersPerMonth: limits.remindersPerMonth,
    adsEnabled: plan === "free",
    premium: plan !== "free",
  };
}
