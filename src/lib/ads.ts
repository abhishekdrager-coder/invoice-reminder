import { PlanType } from "@/types/db";

export function shouldShowAds(plan: PlanType, showAdsFlag: boolean) {
  if (!showAdsFlag) return false;
  return plan === "free";
}
