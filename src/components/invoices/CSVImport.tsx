"use client";

import Papa from "papaparse";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

import { importCSV } from "@/app/(dashboard)/invoices/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { CsvInvoicePayload } from "@/types";

export function CSVImport() {
  const [rows, setRows] = useState<CsvInvoicePayload[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const parsed = results.data as Array<Record<string, string | undefined>>;
        const nextRows = parsed.map((row) => ({
          clientName: row.clientName ?? row.client_name ?? "",
          clientEmail: row.clientEmail ?? row.client_email ?? "",
          clientCompany: row.clientCompany ?? row.client_company ?? "",
          invoiceNumber: row.invoiceNumber ?? row.invoice_number ?? "",
          amount: Number(row.amount ?? 0),
          currency: row.currency ?? "USD",
          dueDate: row.dueDate ?? row.due_date ?? "",
          description: row.description ?? "",
        }));
        setRows(nextRows);
        toast.success(`Parsed ${nextRows.length} row${nextRows.length === 1 ? "" : "s"}.`);
      },
      error(error) {
        toast.error(error.message);
      },
    });
  };

  const handleImport = () => {
    startTransition(async () => {
      const result = await importCSV(rows);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setRows([]);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import invoices by CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input type="file" accept=".csv" onChange={handleFile} className="block w-full text-sm text-slate-600" />
        <p className="text-sm text-slate-500">Expected columns: clientName, clientEmail, clientCompany, invoiceNumber, amount, currency, dueDate, description.</p>
        {rows.length > 0 ? <p className="text-sm font-medium text-slate-700">Ready to import {rows.length} rows.</p> : null}
        <Button type="button" variant="secondary" onClick={handleImport} loading={isPending} disabled={rows.length === 0}>
          Import CSV
        </Button>
      </CardContent>
    </Card>
  );
}
