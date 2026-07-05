"use client";

import Papa from "papaparse";
import { useState } from "react";

type Row = {
  clientName: string;
  clientEmail: string;
  amount: number;
  dueDate: string;
  invoiceNumber?: string;
  notes?: string;
};

export function CsvImporter() {
  const [message, setMessage] = useState<string>("");

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const parsed = await new Promise<Row[]>((resolve, reject) => {
      Papa.parse<Row>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error),
      });
    });

    const response = await fetch("/api/invoices/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows: parsed }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? "Import failed");
      return;
    }

    setMessage(`Imported ${payload.inserted} invoice(s)`);
    window.location.reload();
  }

  return (
    <div className="rounded-md border border-stone-300 bg-white p-4">
      <p className="mb-2 text-sm font-medium">CSV import</p>
      <input type="file" accept=".csv" onChange={onChange} className="text-sm" />
      {message ? <p className="mt-2 text-sm text-stone-700">{message}</p> : null}
    </div>
  );
}
