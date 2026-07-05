import Link from "next/link";
import { requireUserContext } from "@/lib/authorization";
import { getInvoiceForOwner } from "@/lib/invoice-repository";
import { sanitizeText } from "@/lib/sanitize";

export default async function InvoicePreviewPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const user = await requireUserContext();
  const { invoiceId } = await params;
  const id = sanitizeText(invoiceId);
  const { invoice, lines } = await getInvoiceForOwner(user.userId, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoice Preview</h1>
        <div className="flex gap-2">
          <Link href={`/api/invoices/${invoice.id}/pdf`} className="rounded border border-stone-300 px-3 py-2 text-sm">Download PDF</Link>
          <form action={`/api/invoices/${invoice.id}/send`} method="POST">
            <button className="rounded bg-sky-600 px-3 py-2 text-sm text-white">Send Invoice</button>
          </form>
        </div>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <p><strong>Invoice:</strong> {invoice.invoice_number}</p>
        <p><strong>Status:</strong> {invoice.lifecycle_status}</p>
        <p><strong>Issue:</strong> {invoice.issue_date}</p>
        <p><strong>Due:</strong> {invoice.due_date}</p>
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
            {lines.map((line, index) => (
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
        <p><strong>Subtotal:</strong> {(invoice.subtotal_cents / 100).toFixed(2)} {invoice.currency}</p>
        <p><strong>Tax:</strong> {(invoice.tax_total_cents / 100).toFixed(2)} {invoice.currency}</p>
        <p><strong>Discount:</strong> {(invoice.discount_total_cents / 100).toFixed(2)} {invoice.currency}</p>
        <p className="text-xl font-semibold"><strong>Total:</strong> {(invoice.grand_total_cents / 100).toFixed(2)} {invoice.currency}</p>
        <p className="text-xl font-semibold"><strong>Amount due:</strong> {(invoice.amount_due_cents / 100).toFixed(2)} {invoice.currency}</p>
      </div>
    </div>
  );
}
