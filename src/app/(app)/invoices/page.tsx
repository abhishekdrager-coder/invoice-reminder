import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, requireUserContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { CsvImporter } from "@/components/csv-importer";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { sanitizeText } from "@/lib/sanitize";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  async function updateStatus(formData: FormData) {
    "use server";
    const currentUser = await requireUserContext();
    const invoiceId = sanitizeText(formData.get("invoiceId"));
    const lifecycleStatus = sanitizeText(formData.get("lifecycleStatus"));
    const paymentStatus = sanitizeText(formData.get("paymentStatus"));
    const amountPaidCents = Number(formData.get("amountPaidCents") ?? 0);
    const supabase = await createClient();

    const payload = {
      invoiceId,
      lifecycleStatus: lifecycleStatus || undefined,
      paymentStatus: paymentStatus || undefined,
      amountPaidCents: Number.isFinite(amountPaidCents) ? amountPaidCents : undefined,
    };

    const nextStatus = paymentStatus === "paid" ? "paid" : paymentStatus === "overdue" ? "overdue" : undefined;
    const amountPaid = Number.isFinite(amountPaidCents) ? amountPaidCents : undefined;
    const update: Record<string, unknown> = {
      lifecycle_status: lifecycleStatus || undefined,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    if (paymentStatus === "paid") {
      update.paid_at = new Date().toISOString();
    }
    if (amountPaid !== undefined) {
      update.amount_paid_cents = amountPaid;
    }

    await supabase.from("invoices").update(update).eq("id", invoiceId).eq("profile_id", currentUser.userId);

    if (lifecycleStatus === "paid" || lifecycleStatus === "canceled") {
      await supabase
        .from("reminders")
        .update({ status: "skipped", failure_reason: `Invoice marked ${lifecycleStatus} manually` })
        .eq("invoice_id", invoiceId)
        .eq("profile_id", currentUser.userId)
        .eq("status", "pending");
    }

    await supabase.from("invoice_events").insert({
      profile_id: currentUser.userId,
      invoice_id: invoiceId,
      event_type: "invoice_status_action_from_ui",
      metadata: payload,
    });

    redirect("/invoices?success=Invoice updated");
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id,amount_cents,due_date,status,lifecycle_status,invoice_number,public_token,currency,amount_due_cents,clients(name,email)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Toast message={resolvedSearchParams.success ?? resolvedSearchParams.error} />
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
              <th className="px-4 py-3">Lifecycle</th>
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
                <td className="px-4 py-3 capitalize">{invoice.lifecycle_status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/invoices/${invoice.id}/preview`} className="rounded border border-stone-300 px-2 py-1 text-xs">Preview</Link>
                    <Link href={`/api/invoices/${invoice.id}/pdf`} className="rounded border border-stone-300 px-2 py-1 text-xs">PDF</Link>
                    <form action={`/api/invoices/${invoice.id}/send`} method="POST">
                      <button className="rounded border border-stone-300 px-2 py-1 text-xs">Send</button>
                    </form>
                    <form action={`/api/invoices/${invoice.id}/duplicate`} method="POST">
                      <button className="rounded border border-stone-300 px-2 py-1 text-xs">Duplicate</button>
                    </form>
                    {invoice.public_token ? <Link href={`/i/${invoice.public_token}`} className="rounded border border-stone-300 px-2 py-1 text-xs">Public Link</Link> : null}
                    <form action={updateStatus}>
                      <input name="invoiceId" type="hidden" value={invoice.id} />
                      <input name="paymentStatus" type="hidden" value="paid" />
                      <input name="lifecycleStatus" type="hidden" value="paid" />
                      <input name="amountPaidCents" type="hidden" value={String(invoice.amount_cents)} />
                      <Button type="submit" variant="secondary">Mark paid</Button>
                    </form>
                    <form action={updateStatus}>
                      <input name="invoiceId" type="hidden" value={invoice.id} />
                      <input name="lifecycleStatus" type="hidden" value="canceled" />
                      <Button type="submit" variant="secondary">Cancel</Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
