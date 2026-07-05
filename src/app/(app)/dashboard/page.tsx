import Link from "next/link";
import { startOfMonth } from "date-fns";
import { requireUser } from "@/lib/auth";
import { shouldShowAds } from "@/lib/ads";
import { normalizePlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase-server";
import { AdSlot } from "@/components/ads/ad-slot";

function card(label: string, value: string) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("amount_cents,due_date,status")
    .eq("profile_id", user.id);

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();

  const outstanding = (invoices ?? [])
    .filter((i) => i.status === "unpaid")
    .reduce((sum, i) => sum + i.amount_cents, 0);

  const overdueCount = (invoices ?? []).filter(
    (i) => i.status === "unpaid" && new Date(i.due_date) < now,
  ).length;

  const { data: recoveredRows } = await supabase
    .from("reminders")
    .select("recovered_amount_cents")
    .eq("profile_id", user.id)
    .eq("intent_outcome", "paid")
    .gte("updated_at", monthStart);

  const recovered = (recoveredRows ?? []).reduce(
    (sum, item) => sum + (item.recovered_amount_cents ?? 0),
    0,
  );

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("profile_id", user.id)
    .maybeSingle();

  const plan = normalizePlan(subscription?.plan);
  const adsEnabled = shouldShowAds(plan, process.env.SHOW_ADS !== "false");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-stone-600">Track reminders and recover faster.</p>
        </div>
        <Link href="/invoices/new" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">New invoice</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {card("Outstanding amount", `$${(outstanding / 100).toFixed(2)}`)}
        {card("Overdue count", String(overdueCount))}
        {card("Recovered this month", `$${(recovered / 100).toFixed(2)}`)}
      </div>

      {adsEnabled ? <AdSlot placement="dashboard_top" /> : null}
    </div>
  );
}
