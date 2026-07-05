import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { createClient } from "@/lib/supabase-server";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { businessProfileSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUserApiContext();
    const supabase = await createClient();

    const { data } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("profile_id", user.userId)
      .maybeSingle();

    return NextResponse.json({ profile: data ?? null });
  } catch (error) {
    return handleRouteError(error, "business_profile.get");
  }
}

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 64 * 1024);
    assertSameOrigin(request);

    const user = await requireUserApiContext();
    const parsed = businessProfileSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid business profile payload", 400, "invalid_payload");
    }

    const supabase = await createClient();
    const row = {
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
    };

    const { error } = await supabase
      .from("business_profiles")
      .upsert(row, { onConflict: "profile_id" });

    if (error) {
      throw new AppError("Failed to save business profile", 500, "business_profile_save_failed", { error: error.message });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "business_profile.post");
  }
}
