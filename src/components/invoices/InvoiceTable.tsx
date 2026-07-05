"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import toast from "react-hot-toast";

import { deleteInvoice, markAsPaid } from "@/app/(dashboard)/invoices/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceWithClient } from "@/types";

type InvoiceTableProps = {
  invoices: InvoiceWithClient[];
};

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleMarkPaid = (id: string) => {
    startTransition(async () => {
      const result = await markAsPaid(id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteInvoice(id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.length > 0 ? (
          invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <Link href={`/invoices/${invoice.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                  {invoice.invoice_number}
                </Link>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-slate-900">{invoice.clients?.name ?? "Unknown client"}</p>
                  <p className="text-xs text-slate-500">{invoice.clients?.email}</p>
                </div>
              </TableCell>
              <TableCell>{formatDate(invoice.due_date)}</TableCell>
              <TableCell><Badge status={invoice.status} /></TableCell>
              <TableCell className="text-right">{formatCurrency(Number(invoice.amount), invoice.currency)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  {invoice.status !== "paid" ? (
                    <Button type="button" variant="secondary" onClick={() => handleMarkPaid(invoice.id)} loading={isPending}>
                      Mark paid
                    </Button>
                  ) : null}
                  <Link href={`/invoices/${invoice.id}`} className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    Edit
                  </Link>
                  <Button type="button" variant="danger" onClick={() => handleDelete(invoice.id)} loading={isPending}>
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-500">No invoices match your filter yet.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
