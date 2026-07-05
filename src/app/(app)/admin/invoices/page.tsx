import { requireAdminContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminInvoicesPage() {
  await requireAdminContext();
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("id,amount_cents,due_date,status,invoice_number,profiles(email),clients(name,email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Global Invoices (Read-only)</h1>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Amount</th>
              <th className="px-3 py-2 text-left">Due</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((inv) => (
              <tr key={inv.id} className="border-t border-stone-200">
                <td className="px-3 py-2">{inv.profiles?.[0]?.email}</td>
                <td className="px-3 py-2">{inv.clients?.[0]?.name} ({inv.clients?.[0]?.email})</td>
                <td className="px-3 py-2">${(inv.amount_cents / 100).toFixed(2)}</td>
                <td className="px-3 py-2">{inv.due_date}</td>
                <td className="px-3 py-2 capitalize">{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
