import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { InvoiceCreateForm } from "@/components/invoice-create-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  const { data: businessProfile } = await supabase
    .from("business_profiles")
    .select("default_currency,default_tax_rate_percent,default_notes,default_footer,payment_instructions,default_payment_terms_days")
    .eq("profile_id", user.id)
    .maybeSingle();

  const issueDate = new Date();
  const termsDays = Number(businessProfile?.default_payment_terms_days ?? 14);
  const dueDate = new Date(issueDate.getTime() + termsDays * 86400_000);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Create invoice</h1>
      {resolvedSearchParams.error ? (
        <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">
          <p>{resolvedSearchParams.error}</p>
          {resolvedSearchParams.error.toLowerCase().includes("plan limit") ? (
            <a href="/settings/billing" data-testid="upgrade-cta" className="mt-1 inline-block font-semibold underline">
              Upgrade plan
            </a>
          ) : null}
        </div>
      ) : null}
      <InvoiceCreateForm
        defaults={{
          currency: businessProfile?.default_currency ?? "USD",
          taxRate: Number(businessProfile?.default_tax_rate_percent ?? 0),
          notes: businessProfile?.default_notes ?? "",
          footer: businessProfile?.default_footer ?? "",
          paymentInstructions: businessProfile?.payment_instructions ?? "",
          paymentTermsDays: termsDays,
          issueDate: issueDate.toISOString().slice(0, 10),
          dueDate: dueDate.toISOString().slice(0, 10),
        }}
      />
    </div>
  );
}
