import { createClient } from "@/lib/supabase-server";
import { AppError } from "@/lib/errors/http";

export async function getInvoiceForOwner(profileId: string, invoiceId: string) {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id,profile_id,client_id,invoice_number,issue_date,due_date,status,lifecycle_status,currency,client_company,billing_address_line1,billing_address_line2,billing_city,billing_province_state,billing_postal_code,billing_country,tax_mode,discount_mode,discount_value,amount_cents,payment_instructions,notes,footer,subtotal_cents,tax_total_cents,discount_total_cents,grand_total_cents,amount_paid_cents,amount_due_cents,public_token,sent_at,clients(name,email)")
    .eq("id", invoiceId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!invoice) {
    throw new AppError("Invoice not found", 404, "not_found");
  }

  const { data: lines } = await supabase
    .from("invoice_line_items")
    .select("description,qty,unit_price_cents,line_total_cents")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });

  const { data: business } = await supabase
    .from("business_profiles")
    .select("legal_business_name,display_business_name,owner_full_name,business_email,business_phone,website,address_line1,address_line2,city,province_state,postal_code,country,brand_accent_color")
    .eq("profile_id", profileId)
    .maybeSingle();

  return { invoice, lines: lines ?? [], business };
}

export async function getInvoiceByPublicToken(token: string) {
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id,profile_id,invoice_number,issue_date,due_date,lifecycle_status,currency,client_company,payment_instructions,notes,footer,subtotal_cents,tax_total_cents,discount_total_cents,grand_total_cents,amount_paid_cents,amount_due_cents,clients(name,email)")
    .eq("public_token", token)
    .maybeSingle();

  if (!invoice) {
    return null;
  }

  const { data: lines } = await supabase
    .from("invoice_line_items")
    .select("description,qty,unit_price_cents,line_total_cents")
    .eq("invoice_id", invoice.id)
    .order("sort_order", { ascending: true });

  const { data: business } = await supabase
    .from("business_profiles")
    .select("legal_business_name,display_business_name,business_email,business_phone,website,address_line1,address_line2,city,province_state,postal_code,country,brand_accent_color")
    .eq("profile_id", invoice.profile_id)
    .maybeSingle();

  return { invoice, lines: lines ?? [], business };
}
