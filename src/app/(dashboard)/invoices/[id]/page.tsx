import { notFound } from "next/navigation";

import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { ClientRow, InvoiceRow, ReminderRow, ReminderSequenceRow } from "@/types";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [invoiceResponse, clientsResponse, sequencesResponse, remindersResponse] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("clients").select("*").eq("user_id", user.id).order("name", { ascending: true }),
    supabase.from("reminder_sequences").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    supabase.from("reminders").select("id, scheduled_at, sent_at, status, created_at, invoice_id, step_id").eq("invoice_id", id).order("scheduled_at", { ascending: true }),
  ]);

  const invoice = invoiceResponse.data as InvoiceRow | null;
  if (!invoice) {
    notFound();
  }

  const clients = (clientsResponse.data ?? []) as ClientRow[];
  const initialClient = clients.find((client) => client.id === invoice.client_id) ?? null;
  const reminders = (remindersResponse.data ?? []) as ReminderRow[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-950">{invoice.invoice_number}</h2>
        <p className="mt-1 text-slate-500">Update invoice details, status, and review reminder activity.</p>
      </div>

      <InvoiceForm
        mode="edit"
        clients={clients}
        sequences={(sequencesResponse.data ?? []) as ReminderSequenceRow[]}
        initialInvoiceNumber={invoice.invoice_number}
        invoice={invoice}
        initialClient={initialClient}
      />

      <Card>
        <CardHeader>
          <CardTitle>Reminder schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scheduled at</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.length > 0 ? (
                reminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell>{formatDate(reminder.scheduled_at)}</TableCell>
                    <TableCell><Badge status={reminder.status} /></TableCell>
                    <TableCell>{reminder.sent_at ? formatDate(reminder.sent_at) : "Not sent"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500">No reminders scheduled yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
