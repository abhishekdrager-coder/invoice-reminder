import { subDays } from "date-fns";
import { requireAdminContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ProfileRefRow = { profile_id: string };
type InvoiceStatusRow = {
  amount_cents: number;
  due_date: string;
  status: string;
  paid_at: string | null;
};
type SubscriptionRow = {
  plan: string;
  status: string;
  current_period_end: string | null;
};

export default async function AdminOverviewPage() {
  await requireAdminContext();

  const sevenDaysAgo = subDays(new Date(), 7).toISOString();
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  const [{ count: totalUsers }, { count: newUsers7d }, { count: invoicesTotal }, { count: remindersSent30d }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabaseAdmin.from("invoices").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("reminders").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", thirtyDaysAgo),
  ]);

  const [{ data: activeInvoiceProfilesData }, { data: activeReminderProfilesData }, { data: paidInvoicesData }, { data: dueInvoicesData }] = await Promise.all([
    supabaseAdmin.from("invoices").select("profile_id").gte("created_at", sevenDaysAgo),
    supabaseAdmin.from("reminders").select("profile_id").gte("created_at", sevenDaysAgo),
    supabaseAdmin.from("invoices").select("id").eq("status", "paid").gte("paid_at", thirtyDaysAgo),
    supabaseAdmin.from("invoices").select("id").gte("due_date", thirtyDaysAgo.slice(0, 10)),
  ]);

  const activeInvoiceProfiles = (activeInvoiceProfilesData ?? []) as ProfileRefRow[];
  const activeReminderProfiles = (activeReminderProfilesData ?? []) as ProfileRefRow[];

  const activeUsers = new Set([
    ...activeInvoiceProfiles.map((r) => r.profile_id),
    ...activeReminderProfiles.map((r) => r.profile_id),
  ]).size;

  const activationRate = totalUsers && totalUsers > 0
    ? ((activeInvoiceProfiles.length / totalUsers) * 100)
    : 0;

  const paidCount30d = paidInvoicesData?.length ?? 0;
  const dueCount30d = dueInvoicesData?.length ?? 0;
  const recoveryRate30d = dueCount30d > 0 ? (paidCount30d / dueCount30d) * 100 : 0;

  const { data: outstandingRowsData } = await supabaseAdmin
    .from("invoices")
    .select("amount_cents,due_date,status,paid_at")
    .in("status", ["unpaid", "paid"]);

  const outstandingRows = (outstandingRowsData ?? []) as InvoiceStatusRow[];

  const outstandingAmount = outstandingRows
    .filter((row) => row.status === "unpaid")
    .reduce((sum, row) => sum + row.amount_cents, 0) / 100;

  const overdueAmount = outstandingRows
    .filter((row) => row.status === "unpaid" && row.due_date < new Date().toISOString().slice(0, 10))
    .reduce((sum, row) => sum + row.amount_cents, 0) / 100;

  const recovered30d = outstandingRows
    .filter((row) => row.status === "paid" && row.paid_at && row.paid_at >= thirtyDaysAgo)
    .reduce((sum, row) => sum + row.amount_cents, 0) / 100;

  const [{ count: remindersCreated30d }, { count: remindersFailed30d }, { data: subscriptionsData }] = await Promise.all([
    supabaseAdmin.from("reminders").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabaseAdmin.from("reminders").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", thirtyDaysAgo),
    supabaseAdmin.from("subscriptions").select("plan,status,current_period_end").limit(500),
  ]);

  const reminderFailureRate = (remindersCreated30d ?? 0) > 0
    ? ((remindersFailed30d ?? 0) / (remindersCreated30d ?? 1)) * 100
    : 0;

  const subscriptions = (subscriptionsData ?? []) as SubscriptionRow[];
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const mrr = activeSubscriptions.reduce((sum, s) => {
    if (s.plan === "premium_lite") return sum + 9;
    if (s.plan === "premium_pro") return sum + 19;
    return sum;
  }, 0);

  const freeToPaid = (totalUsers ?? 0) > 0 ? (activeSubscriptions.length / (totalUsers ?? 1)) * 100 : 0;
  const churned30d = subscriptions.filter(
    (s) => ["canceled", "incomplete_expired"].includes(s.status) && s.current_period_end && s.current_period_end >= thirtyDaysAgo,
  ).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Total users" value={String(totalUsers ?? 0)} />
        <Card title="New users (7d)" value={String(newUsers7d ?? 0)} />
        <Card title="Active users (7d)" value={String(activeUsers)} />
        <Card title="Activation rate" value={`${activationRate.toFixed(1)}%`} />
        <Card title="Total invoices" value={String(invoicesTotal ?? 0)} />
        <Card title="Outstanding amount" value={`$${outstandingAmount.toFixed(2)}`} />
        <Card title="Overdue amount" value={`$${overdueAmount.toFixed(2)}`} />
        <Card title="Recovered (30d)" value={`$${recovered30d.toFixed(2)}`} />
        <Card title="Recovery rate (30d)" value={`${recoveryRate30d.toFixed(1)}%`} />
        <Card title="Reminders sent (30d)" value={String(remindersSent30d ?? 0)} />
        <Card title="Reminder failure rate (30d)" value={`${reminderFailureRate.toFixed(1)}%`} />
        <Card title="MRR" value={`$${mrr}`} />
        <Card title="Free -> paid conversion" value={`${freeToPaid.toFixed(1)}%`} />
        <Card title="Churn (30d)" value={String(churned30d)} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-sm text-stone-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
