"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";

type Line = {
  description: string;
  qty: number;
  unitPriceCents: number;
  taxRatePercent?: number;
};

type Props = {
  defaults: {
    currency: string;
    taxRate: number;
    notes: string;
    footer: string;
    paymentInstructions: string;
    paymentTermsDays: number;
    issueDate: string;
    dueDate: string;
  };
};

export function InvoiceCreateForm({ defaults }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [issueDate, setIssueDate] = useState(defaults.issueDate);
  const [dueDate, setDueDate] = useState(defaults.dueDate);
  const [currency, setCurrency] = useState(defaults.currency || "USD");
  const [taxMode, setTaxMode] = useState<"inclusive" | "exclusive">("exclusive");
  const [discountMode, setDiscountMode] = useState<"fixed" | "percent">("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState(defaults.notes || "");
  const [footer, setFooter] = useState(defaults.footer || "");
  const [paymentInstructions, setPaymentInstructions] = useState(defaults.paymentInstructions || "");
  const [lineItems, setLineItems] = useState<Line[]>([{ description: "", qty: 1, unitPriceCents: 0, taxRatePercent: defaults.taxRate }]);

  const totals = useMemo(() => {
    return calculateInvoiceTotals({
      lines: lineItems,
      defaultTaxRatePercent: defaults.taxRate,
      taxMode,
      discountMode,
      discountValue,
      amountPaidCents: 0,
    });
  }, [defaults.taxRate, discountMode, discountValue, lineItems, taxMode]);

  function updateLine(index: number, patch: Partial<Line>) {
    setLineItems((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLineItems((current) => [...current, { description: "", qty: 1, unitPriceCents: 0, taxRatePercent: defaults.taxRate }]);
  }

  function removeLine(index: number) {
    setLineItems((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  }

  async function submit(lifecycleStatus: "draft" | "sent") {
    setSaving(true);
    setError("");

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientName,
        clientEmail,
        clientCompany,
        issueDate,
        dueDate,
        currency,
        taxMode,
        discountMode,
        discountValue,
        notes,
        footer,
        paymentInstructions,
        lifecycleStatus,
        lineItems,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(payload.error ?? "Failed to create invoice");
      return;
    }

    if (lifecycleStatus === "sent") {
      await fetch(`/api/invoices/${payload.invoiceId}/send`, { method: "POST" });
    }

    router.push("/invoices?success=Invoice created");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
      {error ? <div className="rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</div> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Client name" className="rounded border border-stone-300 px-3 py-2" />
        <input value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="Client email" className="rounded border border-stone-300 px-3 py-2" type="email" />
        <input value={clientCompany} onChange={(event) => setClientCompany(event.target.value)} placeholder="Client company" className="rounded border border-stone-300 px-3 py-2" />
        <input value={currency} onChange={(event) => setCurrency(event.target.value)} placeholder="Currency" className="rounded border border-stone-300 px-3 py-2" />
        <input value={issueDate} onChange={(event) => setIssueDate(event.target.value)} type="date" className="rounded border border-stone-300 px-3 py-2" />
        <input value={dueDate} onChange={(event) => setDueDate(event.target.value)} type="date" className="rounded border border-stone-300 px-3 py-2" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Line items</p>
        {lineItems.map((line, index) => (
          <div key={`line-${index}`} className="grid gap-2 md:grid-cols-6">
            <input value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} placeholder="Description" className="rounded border border-stone-300 px-3 py-2 md:col-span-3" />
            <input value={line.qty} onChange={(event) => updateLine(index, { qty: Number(event.target.value) })} type="number" min={1} className="rounded border border-stone-300 px-3 py-2" />
            <input value={(line.unitPriceCents / 100).toFixed(2)} onChange={(event) => updateLine(index, { unitPriceCents: Math.round(Number(event.target.value || "0") * 100) })} type="number" step="0.01" className="rounded border border-stone-300 px-3 py-2" />
            <button type="button" onClick={() => removeLine(index)} className="rounded border border-stone-300 px-3 py-2 text-sm">Remove</button>
          </div>
        ))}
        <button type="button" onClick={addLine} className="rounded border border-stone-300 px-3 py-2 text-sm">Add line item</button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <select value={taxMode} onChange={(event) => setTaxMode(event.target.value as "inclusive" | "exclusive")} className="rounded border border-stone-300 px-3 py-2">
          <option value="exclusive">Tax exclusive</option>
          <option value="inclusive">Tax inclusive</option>
        </select>
        <select value={discountMode} onChange={(event) => setDiscountMode(event.target.value as "fixed" | "percent")} className="rounded border border-stone-300 px-3 py-2">
          <option value="fixed">Discount fixed (cents)</option>
          <option value="percent">Discount percent</option>
        </select>
        <input value={discountValue} onChange={(event) => setDiscountValue(Number(event.target.value || "0"))} type="number" className="rounded border border-stone-300 px-3 py-2" />
      </div>

      <textarea value={paymentInstructions} onChange={(event) => setPaymentInstructions(event.target.value)} placeholder="Payment instructions" className="w-full rounded border border-stone-300 px-3 py-2" rows={3} />
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" className="w-full rounded border border-stone-300 px-3 py-2" rows={2} />
      <textarea value={footer} onChange={(event) => setFooter(event.target.value)} placeholder="Footer" className="w-full rounded border border-stone-300 px-3 py-2" rows={2} />

      <div className="rounded border border-stone-200 bg-stone-50 p-3 text-sm">
        <p>Subtotal: {(totals.subtotalCents / 100).toFixed(2)} {currency}</p>
        <p>Tax: {(totals.taxTotalCents / 100).toFixed(2)} {currency}</p>
        <p>Discount: {(totals.discountTotalCents / 100).toFixed(2)} {currency}</p>
        <p className="font-semibold">Grand total: {(totals.grandTotalCents / 100).toFixed(2)} {currency}</p>
      </div>

      <div className="flex gap-2">
        <button disabled={saving} type="button" onClick={() => submit("draft")} className="rounded border border-stone-300 px-4 py-2 text-sm">Save draft</button>
        <button disabled={saving} type="button" onClick={() => submit("sent")} className="rounded bg-sky-600 px-4 py-2 text-sm text-white">Send invoice</button>
      </div>
    </div>
  );
}
