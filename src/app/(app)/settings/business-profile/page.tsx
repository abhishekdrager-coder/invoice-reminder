import { requireUserContext } from "@/lib/authorization";
import { createClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { businessProfileSchema } from "@/lib/validation";

export default async function BusinessProfilePage() {
  const user = await requireUserContext();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("profile_id", user.userId)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Business Profile</h1>
      <p className="text-sm text-stone-600">This profile auto-fills invoice branding and payment details.</p>
      <BusinessProfileForm profile={profile} />
    </div>
  );
}

function BusinessProfileForm({ profile }: { profile: Record<string, unknown> | null }) {
  async function save(formData: FormData) {
    "use server";

    const user = await requireUserContext();
    const supabase = await createClient();

    const acceptedPaymentMethods = String(formData.get("acceptedPaymentMethods") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const parsed = businessProfileSchema.safeParse({
      legalBusinessName: formData.get("legalBusinessName"),
      displayBusinessName: formData.get("displayBusinessName"),
      ownerFullName: formData.get("ownerFullName"),
      businessEmail: formData.get("businessEmail"),
      businessPhone: formData.get("businessPhone"),
      website: formData.get("website"),
      logoUrl: formData.get("logoUrl"),
      brandAccentColor: formData.get("brandAccentColor"),
      taxIdLabel: formData.get("taxIdLabel"),
      taxIdValue: formData.get("taxIdValue"),
      addressLine1: formData.get("addressLine1"),
      addressLine2: formData.get("addressLine2"),
      city: formData.get("city"),
      provinceState: formData.get("provinceState"),
      postalCode: formData.get("postalCode"),
      country: formData.get("country"),
      defaultCurrency: formData.get("defaultCurrency"),
      defaultTaxRatePercent: formData.get("defaultTaxRatePercent"),
      invoicePrefix: formData.get("invoicePrefix"),
      defaultPaymentTermsDays: formData.get("defaultPaymentTermsDays"),
      defaultNotes: formData.get("defaultNotes"),
      defaultFooter: formData.get("defaultFooter"),
      bankTransferDetails: formData.get("bankTransferDetails"),
      etransferEmail: formData.get("etransferEmail"),
      paymentInstructions: formData.get("paymentInstructions"),
      acceptedPaymentMethods,
    });
    if (!parsed.success) return;

    await supabase.from("business_profiles").upsert({
      profile_id: user.userId,
      legal_business_name: parsed.data.legalBusinessName || null,
      display_business_name: parsed.data.displayBusinessName || null,
      owner_full_name: parsed.data.ownerFullName || null,
      business_email: parsed.data.businessEmail || null,
      business_phone: parsed.data.businessPhone || null,
      website: parsed.data.website || null,
      logo_url: parsed.data.logoUrl || null,
      brand_accent_color: parsed.data.brandAccentColor || null,
      tax_id_label: parsed.data.taxIdLabel || null,
      tax_id_value: parsed.data.taxIdValue || null,
      address_line1: parsed.data.addressLine1 || null,
      address_line2: parsed.data.addressLine2 || null,
      city: parsed.data.city || null,
      province_state: parsed.data.provinceState || null,
      postal_code: parsed.data.postalCode || null,
      country: parsed.data.country || null,
      default_currency: parsed.data.defaultCurrency,
      default_tax_rate_percent: parsed.data.defaultTaxRatePercent,
      invoice_prefix: parsed.data.invoicePrefix,
      default_payment_terms_days: parsed.data.defaultPaymentTermsDays,
      default_notes: parsed.data.defaultNotes || null,
      default_footer: parsed.data.defaultFooter || null,
      bank_transfer_details: parsed.data.bankTransferDetails || null,
      etransfer_email: parsed.data.etransferEmail || null,
      payment_instructions: parsed.data.paymentInstructions || null,
      accepted_payment_methods: parsed.data.acceptedPaymentMethods,
    }, { onConflict: "profile_id" });
  }

  return (
    <form action={save} className="grid gap-3 rounded-lg border border-stone-200 bg-white p-5 md:grid-cols-2">
      <Field name="legalBusinessName" label="Legal business name" defaultValue={String(profile?.legal_business_name ?? "")} />
      <Field name="displayBusinessName" label="Display business name" defaultValue={String(profile?.display_business_name ?? "")} />
      <Field name="ownerFullName" label="Owner full name" defaultValue={String(profile?.owner_full_name ?? "")} />
      <Field name="businessEmail" label="Business email" type="email" defaultValue={String(profile?.business_email ?? "")} />
      <Field name="businessPhone" label="Business phone" defaultValue={String(profile?.business_phone ?? "")} />
      <Field name="website" label="Website" defaultValue={String(profile?.website ?? "")} />
      <Field name="logoUrl" label="Logo URL" defaultValue={String(profile?.logo_url ?? "")} />
      <Field name="brandAccentColor" label="Brand accent color" defaultValue={String(profile?.brand_accent_color ?? "#0ea5e9")} />
      <Field name="taxIdLabel" label="Tax ID label" defaultValue={String(profile?.tax_id_label ?? "")} />
      <Field name="taxIdValue" label="Tax ID value" defaultValue={String(profile?.tax_id_value ?? "")} />
      <Field name="addressLine1" label="Address line 1" defaultValue={String(profile?.address_line1 ?? "")} />
      <Field name="addressLine2" label="Address line 2" defaultValue={String(profile?.address_line2 ?? "")} />
      <Field name="city" label="City" defaultValue={String(profile?.city ?? "")} />
      <Field name="provinceState" label="Province/state" defaultValue={String(profile?.province_state ?? "")} />
      <Field name="postalCode" label="Postal code" defaultValue={String(profile?.postal_code ?? "")} />
      <Field name="country" label="Country" defaultValue={String(profile?.country ?? "")} />
      <Field name="defaultCurrency" label="Default currency" defaultValue={String(profile?.default_currency ?? "USD")} />
      <Field name="defaultTaxRatePercent" label="Default tax rate %" type="number" defaultValue={String(profile?.default_tax_rate_percent ?? 0)} />
      <Field name="invoicePrefix" label="Invoice prefix" defaultValue={String(profile?.invoice_prefix ?? "INV-")} />
      <Field name="defaultPaymentTermsDays" label="Default payment terms days" type="number" defaultValue={String(profile?.default_payment_terms_days ?? 14)} />
      <TextArea name="defaultNotes" label="Default notes" defaultValue={String(profile?.default_notes ?? "")} />
      <TextArea name="defaultFooter" label="Default footer" defaultValue={String(profile?.default_footer ?? "")} />
      <TextArea name="bankTransferDetails" label="Bank transfer details" defaultValue={String(profile?.bank_transfer_details ?? "")} />
      <Field name="etransferEmail" label="eTransfer email" type="email" defaultValue={String(profile?.etransfer_email ?? "")} />
      <TextArea name="paymentInstructions" label="Payment instructions" defaultValue={String(profile?.payment_instructions ?? "")} />
      <Field name="acceptedPaymentMethods" label="Accepted payment methods (comma separated)" defaultValue={Array.isArray(profile?.accepted_payment_methods) ? profile?.accepted_payment_methods.join(", ") : ""} />
      <div className="md:col-span-2">
        <Button type="submit">Save business profile</Button>
      </div>
    </form>
  );
}

function Field({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue: string; type?: string }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-stone-600">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className="w-full rounded border border-stone-300 px-3 py-2" />
    </label>
  );
}

function TextArea({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="space-y-1 text-sm md:col-span-2">
      <span className="text-stone-600">{label}</span>
      <textarea name={name} defaultValue={defaultValue} className="w-full rounded border border-stone-300 px-3 py-2" rows={3} />
    </label>
  );
}
