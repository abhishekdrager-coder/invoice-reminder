import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, requireUserContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { CsvImporter } from "@/components/csv-importer";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { sanitizeText } from "@/lib/sanitize";

export default async function InvoicesPage({ searchParams }: { searchParams: { success?: string; error?: string } }) {
  const user = await requireUser();
  const supabase = await createClient();

  async function markPaid(formData: FormData) {
    "use server";
    const currentUser = await requireUserContext();
    const invoiceId = sanitizeText(formData.get("invoiceId"));
    const supabase = await createClient();

    await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", invoiceId)
      .eq("profile_id", currentUser.userId);

    await supabase
      .from("reminders")
      .update({ status: "skipped", failure_reason: "Invoice marked paid manually" })
      .eq("invoice_id", invoiceId)
      .eq("profile_id", currentUser.userId)
      .eq("status", "pending");

    redirect("/invoices?success=Invoice marked paid");
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id,amount_cents,due_date,status,invoice_number,clients(name,email)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Toast message={searchParams.success ?? searchParams.error} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Link href="/invoices/new" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">Create invoice</Link>
      </div>

      <CsvImporter />

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((invoice) => (
              <tr key={invoice.id} className="border-t border-stone-200">
                <td className="px-4 py-3">
                  <p className="font-medium">{invoice.clients?.[0]?.name ?? "Unknown"}</p>
                  <p className="text-xs text-stone-500">{invoice.clients?.[0]?.email}</p>
                </td>
                <td className="px-4 py-3">${(invoice.amount_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">{invoice.due_date}</td>
                <td className="px-4 py-3 capitalize">{invoice.status}</td>
                <td className="px-4 py-3">
                  {invoice.status === "unpaid" ? (
                    <form action={markPaid}>
                      <input name="invoiceId" type="hidden" value={invoice.id} />
                      <Button type="submit" variant="secondary">Mark paid</Button>
                    </form>
                  ) : (
                    <span className="text-stone-400">No actions</span>
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
