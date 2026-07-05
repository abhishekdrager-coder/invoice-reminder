import { redirect } from "next/navigation";
import { requireUser, requireUserContext } from "@/lib/auth";
import { checkInvoiceLimit } from "@/lib/quota";
import { createClient } from "@/lib/supabase-server";
import { invoiceSchema } from "@/lib/validation";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { buildReminderSchedule } from "@/lib/reminder-schedule";
import { Button } from "@/components/ui/button";

export default async function NewInvoicePage({ searchParams }: { searchParams: { error?: string } }) {
  await requireUser();

  async function createInvoice(formData: FormData) {
    "use server";
    const currentUser = await requireUserContext();
    const parsed = invoiceSchema.safeParse({
      clientName: sanitizeText(formData.get("clientName")),
      clientEmail: sanitizeEmail(formData.get("clientEmail")),
      amount: formData.get("amount"),
      dueDate: formData.get("dueDate"),
      invoiceNumber: sanitizeText(formData.get("invoiceNumber")),
      notes: sanitizeText(formData.get("notes")),
    });

    if (!parsed.success) {
      redirect("/invoices/new?error=Invalid invoice data");
    }

    const supabase = await createClient();
    const limitCheck = await checkInvoiceLimit(currentUser.userId, 1);

    if (!limitCheck.allowed) {
      redirect(`/invoices/new?error=Plan limit reached (${limitCheck.current}/${limitCheck.limit})`);
    }

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("profile_id", currentUser.userId)
      .eq("email", parsed.data.clientEmail)
      .maybeSingle();

    let clientId = existingClient?.id;

    if (!clientId) {
      const { data: createdClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          profile_id: currentUser.userId,
          name: parsed.data.clientName,
          email: parsed.data.clientEmail,
        })
        .select("id")
        .single();

      if (clientError || !createdClient) {
        redirect("/invoices/new?error=Could not create client");
      }

      clientId = createdClient.id;
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        profile_id: currentUser.userId,
        client_id: clientId,
        amount_cents: Math.round(parsed.data.amount * 100),
        due_date: parsed.data.dueDate,
        status: "unpaid",
        invoice_number: parsed.data.invoiceNumber || null,
        notes: parsed.data.notes || null,
      })
      .select("id,due_date")
      .single();

    if (invoiceError || !invoice) {
      redirect("/invoices/new?error=Could not create invoice");
    }

    const reminders = buildReminderSchedule(invoice.due_date).map((entry) => ({
      profile_id: currentUser.userId,
      invoice_id: invoice.id,
      scheduled_for: entry.scheduledFor,
      status: "pending",
      idempotency_key: `${invoice.id}:${entry.dayOffset}`,
    }));

    await supabase.from("reminders").insert(reminders);
    redirect("/invoices?success=Invoice created");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Create invoice</h1>
      {searchParams.error ? (
        <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">
          <p>{searchParams.error}</p>
          {searchParams.error.toLowerCase().includes("plan limit") ? (
            <a href="/settings/billing" data-testid="upgrade-cta" className="mt-1 inline-block font-semibold underline">
              Upgrade plan
            </a>
          ) : null}
        </div>
      ) : null}
      <form action={createInvoice} className="space-y-3 rounded-lg border border-stone-200 bg-white p-5">
        <input name="clientName" placeholder="Client name" required className="w-full rounded border border-stone-300 px-3 py-2" />
        <input name="clientEmail" type="email" placeholder="Client email" required className="w-full rounded border border-stone-300 px-3 py-2" />
        <input name="amount" type="number" step="0.01" placeholder="Amount" required className="w-full rounded border border-stone-300 px-3 py-2" />
        <input name="dueDate" type="date" required className="w-full rounded border border-stone-300 px-3 py-2" />
        <input name="invoiceNumber" placeholder="Invoice number (optional)" className="w-full rounded border border-stone-300 px-3 py-2" />
        <textarea name="notes" placeholder="Notes (optional)" className="w-full rounded border border-stone-300 px-3 py-2" />
        <Button type="submit">Save invoice</Button>
      </form>
    </div>
  );
}
