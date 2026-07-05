import { PLAN_ORDER, PLAN_CONFIG } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [subscriptionResponse, invoicesResponse, remindersResponse] = await Promise.all([
    supabase.from("subscriptions").select("plan, status, stripe_customer_id, current_period_end").eq("user_id", user.id).maybeSingle(),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("reminders").select("id", { count: "exact", head: true }).in(
      "invoice_id",
      ((await supabase.from("invoices").select("id").eq("user_id", user.id)).data ?? []).map((invoice) => invoice.id),
    ),
  ]);

  const currentPlan = subscriptionResponse.data?.plan ?? "free";
  const currentStatus = subscriptionResponse.data?.status ?? "active";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-950">Billing</h2>
        <p className="mt-1 text-slate-500">Manage subscriptions, usage limits, and your Stripe customer portal.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-950 capitalize">{currentPlan}</p>
            <p className="mt-2 text-sm text-slate-500 capitalize">Subscription status: {currentStatus}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invoices used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-950">{invoicesResponse.count ?? 0}</p>
            <p className="mt-2 text-sm text-slate-500">of {PLAN_CONFIG[currentPlan].invoiceLimit} available in your plan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reminders scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-950">{remindersResponse.count ?? 0}</p>
            <p className="mt-2 text-sm text-slate-500">of {PLAN_CONFIG[currentPlan].reminderLimit} included per month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLAN_CONFIG[planId];
          return (
            <Card key={planId} className={planId === currentPlan ? "border-blue-300 ring-2 ring-blue-100" : undefined}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-950">
                  {plan.priceMonthly === 0 ? "Free" : `${formatCurrency(plan.priceMonthly)}/mo`}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <form action="/api/stripe/checkout" method="POST" className="mt-6">
                  <input type="hidden" name="plan" value={planId} />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    disabled={planId === currentPlan}
                  >
                    {planId === currentPlan ? "Current plan" : `Switch to ${plan.name}`}
                  </button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <form action="/api/stripe/portal" method="POST">
        <button type="submit" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">
          Open Stripe customer portal
        </button>
      </form>
    </div>
  );
}
