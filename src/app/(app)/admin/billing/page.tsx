import { requireAdminContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

type BillingSubscriptionRow = {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  profiles?: Array<{ email: string | null }> | null;
};

export default async function AdminBillingPage() {
  await requireAdminContext();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: subscriptionsData } = await supabaseAdmin
    .from("subscriptions")
    .select("id,plan,status,current_period_end,profiles(email)")
    .order("updated_at", { ascending: false })
    .limit(300);

  const subscriptions = (subscriptionsData ?? []) as BillingSubscriptionRow[];

  const failed = subscriptions.filter((s) => !["active", "trialing"].includes(s.status));
  const active = subscriptions.filter((s) => s.status === "active");
  const activeLite = active.filter((s) => s.plan === "premium_lite").length;
  const activePro = active.filter((s) => s.plan === "premium_pro").length;
  const churned30d = subscriptions.filter(
    (s) => ["canceled", "incomplete_expired"].includes(s.status) && s.current_period_end && s.current_period_end >= thirtyDaysAgo,
  ).length;

  const mrr = active.reduce((sum, s) => {
    if (s.plan === "premium_lite") return sum + 9;
    if (s.plan === "premium_pro") return sum + 19;
    return sum;
  }, 0);

  const { count: totalUsers } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
  const freeToPaid = totalUsers && totalUsers > 0 ? active.length / totalUsers : 0;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Billing Summary</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Active premium_lite" value={String(activeLite)} />
        <Stat label="Active premium_pro" value={String(activePro)} />
        <Stat label="MRR" value={`$${mrr}`} />
        <Stat label="Free -> paid conversion" value={`${(freeToPaid * 100).toFixed(1)}%`} />
        <Stat label="Churned (30d)" value={String(churned30d)} />
      </div>
      <p className="text-sm text-stone-600">Failed/non-active subscriptions: {failed.length}</p>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Plan</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Period end</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => (
              <tr key={s.id} className="border-t border-stone-200">
                <td className="px-3 py-2">{s.profiles?.[0]?.email}</td>
                <td className="px-3 py-2 capitalize">{s.plan}</td>
                <td className="px-3 py-2">{s.status}</td>
                <td className="px-3 py-2">{s.current_period_end ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
