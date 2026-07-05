import Link from "next/link";
import { startOfMonth } from "date-fns";

import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceWithClient } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [invoiceResponse, recentResponse] = await Promise.all([
    supabase.from("invoices").select("id, amount, due_date, status, updated_at").eq("user_id", user.id),
    supabase
      .from("invoices")
      .select("id, invoice_number, amount, currency, due_date, status, clients(id, name, email, company)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const invoices = (invoiceResponse.data ?? []) as Array<{ id: string; amount: number; due_date: string; status: string; updated_at: string }>;
  const recentInvoices = (recentResponse.data ?? []) as unknown as InvoiceWithClient[];
  const now = new Date();
  const monthStart = startOfMonth(now);

  const outstandingAmount = invoices.filter((invoice) => invoice.status === "unpaid").reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const overdueCount = invoices.filter((invoice) => invoice.status === "unpaid" && new Date(invoice.due_date) < now).length;
  const recoveredThisMonth = invoices
    .filter((invoice) => invoice.status === "paid" && new Date(invoice.updated_at) >= monthStart)
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Outstanding Amount" value={formatCurrency(outstandingAmount)} description="All open invoices" />
        <StatCard label="Overdue Count" value={String(overdueCount)} description="Invoices past due date" />
        <StatCard label="Recovered This Month" value={formatCurrency(recoveredThisMonth)} description="Paid in current month" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/invoices/new" className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
          New invoice
        </Link>
        <Link href="/settings/reminders" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">
          Edit reminder sequence
        </Link>
        <Link href="/settings/billing" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">
          Manage billing
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.length > 0 ? (
                recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                        {invoice.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.clients?.name ?? "Unknown client"}</TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell><Badge status={invoice.status} /></TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(invoice.amount), invoice.currency)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">No invoices yet. Create your first invoice to start automating reminders.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
