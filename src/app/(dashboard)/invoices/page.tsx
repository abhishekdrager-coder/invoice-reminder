import Link from "next/link";

import { CSVImport } from "@/components/invoices/CSVImport";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { InvoiceStatus, InvoiceWithClient } from "@/types";

export const dynamic = "force-dynamic";

const filters: Array<{ label: string; value: "all" | InvoiceStatus }> = [
  { label: "All", value: "all" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Paid", value: "paid" },
  { label: "Disputed", value: "disputed" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: "all" | InvoiceStatus }>;
}) {
  const params = await searchParams;
  const activeStatus = params.status ?? "all";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let query = supabase
    .from("invoices")
    .select("id, user_id, client_id, invoice_number, amount, currency, due_date, status, description, created_at, updated_at, clients(id, name, email, company)")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true });

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const { data } = await query;
  const invoices = (data ?? []) as unknown as InvoiceWithClient[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-950">Invoices</h2>
          <p className="mt-1 text-slate-500">Track payment status, import invoices, and take action fast.</p>
        </div>
        <Link href="/invoices/new" className="inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
          Create invoice
        </Link>
      </div>

      <CSVImport />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Invoice list</CardTitle>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Link
                key={filter.value}
                href={filter.value === "all" ? "/invoices" : `/invoices?status=${filter.value}`}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium transition",
                  activeStatus === filter.value ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <InvoiceTable invoices={invoices} />
        </CardContent>
      </Card>
    </div>
  );
}
