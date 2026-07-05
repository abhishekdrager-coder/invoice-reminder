import { startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase-server";
import { normalizePlan, PLAN_LIMITS } from "@/lib/plans";
import { PlanType } from "@/types/db";

export function evaluateLimit(plan: PlanType, current: number, incoming: number, kind: "invoices" | "reminders") {
	const limit = kind === "invoices" ? PLAN_LIMITS[plan].activeInvoices : PLAN_LIMITS[plan].remindersPerMonth;
	return {
		allowed: current + incoming <= limit,
		current,
		limit,
		plan,
	};
}

export async function getPlanForProfile(profileId: string) {
	const supabase = await createClient();
	const { data } = await supabase
		.from("subscriptions")
		.select("plan,status")
		.eq("profile_id", profileId)
		.in("status", ["active", "trialing"])
		.maybeSingle();

	return normalizePlan(data?.plan);
}

export async function getUserPlanLimits(userId: string) {
	const plan = await getPlanForProfile(userId);
	return {
		plan,
		maxActiveInvoices: PLAN_LIMITS[plan].activeInvoices,
		maxRemindersPerMonth: PLAN_LIMITS[plan].remindersPerMonth,
		adsEnabled: plan === "free",
	};
}

export function buildUpgradeHint(kind: "invoices" | "reminders") {
	return {
		recommendedPlan: "premium_lite",
		cta: "/settings/billing",
		message:
			kind === "invoices"
				? "Upgrade to premium_lite or premium_pro for higher invoice limits."
				: "Upgrade to premium_lite or premium_pro for higher reminder volume.",
	};
}

export async function checkInvoiceLimit(profileId: string, incoming = 1) {
	const plan = await getPlanForProfile(profileId);
	const supabase = await createClient();
	const { count } = await supabase
		.from("invoices")
		.select("id", { count: "exact", head: true })
		.eq("profile_id", profileId)
		.eq("status", "unpaid");

	return evaluateLimit(plan, count ?? 0, incoming, "invoices");
}

export async function checkReminderMonthlyLimit(profileId: string, incoming = 1) {
	const plan = await getPlanForProfile(profileId);
	const supabase = await createClient();
	const monthStart = startOfMonth(new Date()).toISOString();

	const { count } = await supabase
		.from("reminders")
		.select("id", { count: "exact", head: true })
		.eq("profile_id", profileId)
		.eq("status", "sent")
		.gte("sent_at", monthStart);

	return evaluateLimit(plan, count ?? 0, incoming, "reminders");
}
