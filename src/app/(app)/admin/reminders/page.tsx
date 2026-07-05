import { requireAdminContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminRemindersPage() {
  await requireAdminContext();
  const { data: reminders } = await supabaseAdmin
    .from("reminders")
    .select("id,status,failure_reason,scheduled_for,sent_at,profiles(email),invoices(invoice_number)")
    .in("status", ["sent", "failed"]) 
    .order("scheduled_for", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Reminder Queue</h1>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2 text-left">Invoice</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Scheduled</th>
              <th className="px-3 py-2 text-left">Error</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {(reminders ?? []).map((r) => (
              <tr key={r.id} className="border-t border-stone-200">
                <td className="px-3 py-2">{r.profiles?.[0]?.email}</td>
                <td className="px-3 py-2">{r.invoices?.[0]?.invoice_number ?? "-"}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2">{r.scheduled_for}</td>
                <td className="px-3 py-2">{r.failure_reason ?? "-"}</td>
                <td className="px-3 py-2">
                  {r.status === "failed" ? (
                    <form action="/api/admin/reminders/retry" method="POST">
                      <input name="reminderId" value={r.id} type="hidden" />
                      <button className="rounded border border-stone-300 px-2 py-1 text-xs">Retry</button>
                    </form>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
