import { format } from "date-fns";

import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ClientRow, ReminderSequenceRow } from "@/types";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [clientsResponse, sequencesResponse, lastInvoiceResponse] = await Promise.all([
    supabase.from("clients").select("*").eq("user_id", user.id).order("name", { ascending: true }),
    supabase.from("reminder_sequences").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    supabase.from("invoices").select("invoice_number").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const lastNumber = Number(lastInvoiceResponse.data?.invoice_number?.replace(/\D/g, "") || 0) + 1;
  const suggestedNumber = `INV-${format(new Date(), "yyyy")}-${String(lastNumber).padStart(4, "0")}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-950">Create invoice</h2>
        <p className="mt-1 text-slate-500">Set up invoice details and schedule reminder automation in one pass.</p>
      </div>
      <InvoiceForm
        mode="create"
        clients={(clientsResponse.data ?? []) as ClientRow[]}
        sequences={(sequencesResponse.data ?? []) as ReminderSequenceRow[]}
        initialInvoiceNumber={suggestedNumber}
      />
    </div>
  );
}
