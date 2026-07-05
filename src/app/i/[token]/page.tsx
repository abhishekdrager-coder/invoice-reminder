import { notFound } from "next/navigation";
import { getInvoiceByPublicToken } from "@/lib/invoice-repository";
import { buildInvoiceEmailSubject } from "@/lib/invoice-email";
import { createClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const gate = checkRateLimit(`public-invoice:${token}`, 30, 60_000);
  if (!gate.allowed) {
    return <div className="mx-auto max-w-2xl p-6 text-sm">Too many requests. Please retry shortly.</div>;
  }

  const data = await getInvoiceByPublicToken(token);
  if (!data) {
    notFound();
  }

  const supabase = await createClient();
  await supabase.rpc("bump_invoice_view", { p_invoice_id: data.invoice.id });
  await supabase.from("invoice_events").insert({
    profile_id: data.invoice.profile_id,
    invoice_id: data.invoice.id,
    event_type: "invoice_viewed_public",
    metadata: { token },
  });

  const title = buildInvoiceEmailSubject({
    invoiceNumber: data.invoice.invoice_number ?? data.invoice.id,
    businessName: data.business?.display_business_name ?? data.business?.legal_business_name ?? "NudgePay",
    currency: data.invoice.currency,
    amountDueCents: data.invoice.amount_due_cents,
    dueDate: data.invoice.due_date,
    secureLink: "",
    fromLabel: data.business?.business_email ?? "NudgePay",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <p><strong>Invoice number:</strong> {data.invoice.invoice_number}</p>
        <p><strong>Status:</strong> {data.invoice.lifecycle_status}</p>
        <p><strong>Issue date:</strong> {data.invoice.issue_date}</p>
        <p><strong>Due date:</strong> {data.invoice.due_date}</p>
        <p><strong>Bill to:</strong> {data.invoice.clients?.[0]?.name} ({data.invoice.clients?.[0]?.email})</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Qty</th>
              <th className="px-3 py-2 text-left">Unit</th>
              <th className="px-3 py-2 text-left">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line, index) => (
              <tr key={`${line.description}-${index}`} className="border-t border-stone-200">
                <td className="px-3 py-2">{line.description}</td>
                <td className="px-3 py-2">{line.qty}</td>
                <td className="px-3 py-2">{(line.unit_price_cents / 100).toFixed(2)}</td>
                <td className="px-3 py-2">{(line.line_total_cents / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <p><strong>Subtotal:</strong> {(data.invoice.subtotal_cents / 100).toFixed(2)} {data.invoice.currency}</p>
        <p><strong>Tax:</strong> {(data.invoice.tax_total_cents / 100).toFixed(2)} {data.invoice.currency}</p>
        <p><strong>Discount:</strong> {(data.invoice.discount_total_cents / 100).toFixed(2)} {data.invoice.currency}</p>
        <p className="text-xl font-semibold"><strong>Amount due:</strong> {(data.invoice.amount_due_cents / 100).toFixed(2)} {data.invoice.currency}</p>
        {data.invoice.payment_instructions ? <p className="mt-3 text-sm">{data.invoice.payment_instructions}</p> : null}
      </div>
    </div>
  );
}
