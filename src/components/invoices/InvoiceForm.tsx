"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { z } from "zod";

import { createInvoice, updateInvoice } from "@/app/(dashboard)/invoices/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDateInput } from "@/lib/utils";
import type { ClientRow, InvoiceRow, ReminderSequenceRow } from "@/types";

const formSchema = z.object({
  invoiceNumber: z.string().min(2, "Invoice number is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  currency: z.string().min(3).max(3),
  dueDate: z.string().min(1, "Due date is required."),
  description: z.string().optional(),
  clientMode: z.enum(["existing", "new"]),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  clientNotes: z.string().optional(),
  reminderSequenceId: z.string().optional(),
  status: z.enum(["unpaid", "paid", "disputed"]).default("unpaid"),
});

type InvoiceFormProps = {
  mode: "create" | "edit";
  clients: ClientRow[];
  sequences: ReminderSequenceRow[];
  initialInvoiceNumber: string;
  invoice?: InvoiceRow;
  initialClient?: ClientRow | null;
};

export function InvoiceForm({ mode, clients, sequences, initialInvoiceNumber, invoice, initialClient }: InvoiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState({
    invoiceNumber: invoice?.invoice_number ?? initialInvoiceNumber,
    amount: invoice ? String(invoice.amount) : "",
    currency: invoice?.currency ?? "USD",
    dueDate: invoice ? formatDateInput(invoice.due_date) : formatDateInput(new Date()),
    description: invoice?.description ?? "",
    clientMode: initialClient ? "existing" : clients.length > 0 ? "existing" : "new",
    clientId: invoice?.client_id ?? clients[0]?.id ?? "",
    clientName: initialClient?.name ?? "",
    clientEmail: initialClient?.email ?? "",
    clientPhone: initialClient?.phone ?? "",
    clientCompany: initialClient?.company ?? "",
    clientNotes: initialClient?.notes ?? "",
    reminderSequenceId: sequences.find((sequence) => sequence.is_default)?.id ?? sequences[0]?.id ?? "",
    status: invoice?.status ?? "unpaid",
  });

  const sequenceOptions = useMemo(() => sequences, [sequences]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = formSchema.safeParse(values);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form values.");
      return;
    }

    if (parsed.data.clientMode === "existing" && !parsed.data.clientId) {
      toast.error("Select a client.");
      return;
    }

    if (parsed.data.clientMode === "new" && (!parsed.data.clientName || !parsed.data.clientEmail)) {
      toast.error("New client name and email are required.");
      return;
    }

    startTransition(async () => {
      const payload = {
        clientId: parsed.data.clientMode === "existing" ? parsed.data.clientId : undefined,
        newClient:
          parsed.data.clientMode === "new"
            ? {
                name: parsed.data.clientName ?? "",
                email: parsed.data.clientEmail ?? "",
                phone: parsed.data.clientPhone,
                company: parsed.data.clientCompany,
                notes: parsed.data.clientNotes,
              }
            : undefined,
        invoiceNumber: parsed.data.invoiceNumber,
        amount: Number(parsed.data.amount),
        currency: parsed.data.currency.toUpperCase(),
        dueDate: parsed.data.dueDate,
        description: parsed.data.description,
        reminderSequenceId: parsed.data.reminderSequenceId || undefined,
      };

      const result =
        mode === "create"
          ? await createInvoice(payload)
          : await updateInvoice({
              id: invoice!.id,
              status: parsed.data.status,
              ...payload,
            });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push(result.redirectTo ?? (mode === "create" ? "/invoices" : `/invoices/${invoice!.id}`));
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create invoice" : "Update invoice"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Client mode"
              value={values.clientMode}
              onChange={(event) => setValues((current) => ({ ...current, clientMode: event.target.value as "existing" | "new" }))}
            >
              <option value="existing">Select existing client</option>
              <option value="new">Create new client</option>
            </Select>
            {values.clientMode === "existing" ? (
              <Select label="Client" value={values.clientId} onChange={(event) => setValues((current) => ({ ...current, clientId: event.target.value }))}>
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} · {client.email}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 md:col-span-1">
                <Input label="Client name" value={values.clientName} onChange={(event) => setValues((current) => ({ ...current, clientName: event.target.value }))} required />
                <Input label="Client email" type="email" value={values.clientEmail} onChange={(event) => setValues((current) => ({ ...current, clientEmail: event.target.value }))} required />
              </div>
            )}
          </div>

          {values.clientMode === "new" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Phone" value={values.clientPhone} onChange={(event) => setValues((current) => ({ ...current, clientPhone: event.target.value }))} />
              <Input label="Company" value={values.clientCompany} onChange={(event) => setValues((current) => ({ ...current, clientCompany: event.target.value }))} />
              <Input label="Notes" value={values.clientNotes} onChange={(event) => setValues((current) => ({ ...current, clientNotes: event.target.value }))} />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Invoice number" value={values.invoiceNumber} onChange={(event) => setValues((current) => ({ ...current, invoiceNumber: event.target.value }))} required />
            <Input label="Amount" type="number" min="0.01" step="0.01" value={values.amount} onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))} required />
            <Select label="Currency" value={values.currency} onChange={(event) => setValues((current) => ({ ...current, currency: event.target.value }))}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </Select>
            <Input label="Due date" type="date" value={values.dueDate} onChange={(event) => setValues((current) => ({ ...current, dueDate: event.target.value }))} required />
            <Select label="Reminder sequence" value={values.reminderSequenceId} onChange={(event) => setValues((current) => ({ ...current, reminderSequenceId: event.target.value }))}>
              <option value="">Use default sequence</option>
              {sequenceOptions.map((sequence) => (
                <option key={sequence.id} value={sequence.id}>
                  {sequence.name}{sequence.is_default ? " (default)" : ""}
                </option>
              ))}
            </Select>
            {mode === "edit" ? (
              <Select label="Status" value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as "unpaid" | "paid" | "disputed" }))}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="disputed">Disputed</option>
              </Select>
            ) : null}
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              className="min-h-32 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              placeholder="Monthly retainer, project milestone, or other notes"
            />
          </label>

          <div className="flex justify-end">
            <Button type="submit" loading={isPending}>{mode === "create" ? "Create invoice" : "Save changes"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
