import { PlanType } from "@/types/db";

export const PLAN_LIMITS: Record<PlanType, { activeInvoices: number; remindersPerMonth: number }> = {
  free: { activeInvoices: 5, remindersPerMonth: 20 },
  premium_lite: { activeInvoices: 30, remindersPerMonth: 200 },
  premium_pro: { activeInvoices: Number.MAX_SAFE_INTEGER, remindersPerMonth: Number.MAX_SAFE_INTEGER },
};

export function normalizePlan(plan: string | null | undefined): PlanType {
  if (plan === "premium_lite" || plan === "premium_pro") return plan;
  if (plan === "starter") return "premium_lite";
  if (plan === "pro" || plan === "premium") return "premium_pro";
  return "free";
}

export function hasPremiumBenefits(plan: PlanType) {
  return plan !== "free";
}

export function formatLimit(limit: number) {
  return Number.isFinite(limit) && limit < Number.MAX_SAFE_INTEGER ? String(limit) : "unlimited";
}
