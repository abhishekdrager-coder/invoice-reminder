import { requireUser } from "@/lib/auth";
import { startOfMonth } from "date-fns";
import { formatLimit, hasPremiumBenefits, normalizePlan, PLAN_LIMITS } from "@/lib/plans";
import { createClient } from "@/lib/supabase-server";

export default async function BillingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end")
    .eq("profile_id", user.id)
    .maybeSingle();

  const plan = normalizePlan(subscription?.plan);
  const premium = hasPremiumBenefits(plan);

  const [{ count: activeInvoices }, { count: remindersThisMonth }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("status", "unpaid"),
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("status", "sent")
      .gte("sent_at", startOfMonth(new Date()).toISOString()),
  ]);

  const limits = PLAN_LIMITS[plan];
  const invoiceLimitReached = (activeInvoices ?? 0) >= limits.activeInvoices;
  const reminderLimitReached = (remindersThisMonth ?? 0) >= limits.remindersPerMonth;
  const showUpgradeCta = plan === "free" && (invoiceLimitReached || reminderLimitReached);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>

      <div className="rounded-lg border border-stone-200 bg-white p-5 text-sm">
        <p>Current plan: <span className="font-semibold capitalize">{plan}</span></p>
        <p>Status: <span className="font-semibold capitalize">{subscription?.status ?? "inactive"}</span></p>
        <p>Period end: <span className="font-semibold">{subscription?.current_period_end ?? "-"}</span></p>
        <p>Ads: <span className="font-semibold">{premium ? "Disabled" : "Enabled"}</span></p>
        <p>Invoices used: <span className="font-semibold">{activeInvoices ?? 0} / {formatLimit(limits.activeInvoices)}</span></p>
        <p>Reminders used this month: <span className="font-semibold">{remindersThisMonth ?? 0} / {formatLimit(limits.remindersPerMonth)}</span></p>
        {showUpgradeCta ? (
          <p className="mt-2 rounded-md bg-amber-50 p-2 text-amber-900">
            You hit free plan limits. <a href="/settings/billing" className="underline">Upgrade to remove limits and ads</a>.
          </p>
        ) : null}
        {premium ? (
          <form action="/api/stripe/portal" method="POST" className="mt-3">
            <button className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100">Manage subscription in Stripe Portal</button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-medium">Free</h2>
          <p className="mt-1 text-sm text-stone-600">5 active invoices, 20 reminders/month, ads enabled</p>
          <span className="mt-3 inline-block rounded bg-stone-100 px-2 py-1 text-xs">Current baseline</span>
        </div>

        <form action="/api/stripe/checkout" method="POST" className="rounded-lg border border-stone-200 bg-white p-5">
          <input type="hidden" name="plan" value="premium_lite" />
          <h2 className="text-lg font-medium">Premium Lite ($9/mo)</h2>
          <p className="mt-1 text-sm text-stone-600">30 active invoices, 200 reminders/month.</p>
          <span className="mt-2 inline-block rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800">Remove Ads</span>
          <button className="mt-3 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white">Upgrade to Premium Lite</button>
        </form>

        <form action="/api/stripe/checkout" method="POST" className="rounded-lg border border-stone-200 bg-white p-5">
          <input type="hidden" name="plan" value="premium_pro" />
          <h2 className="text-lg font-medium">Premium Pro ($19/mo)</h2>
          <p className="mt-1 text-sm text-stone-600">Unlimited invoices and reminders.</p>
          <span className="mt-2 inline-block rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800">Remove Ads</span>
          <button className="mt-3 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Upgrade to Premium Pro</button>
        </form>
      </div>
    </div>
  );
}
