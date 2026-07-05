import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { getInvoiceForOwner } from "@/lib/invoice-repository";
import { generateInvoicePublicToken } from "@/lib/invoice-token";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { sanitizeText } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: Request, context: { params: Promise<{ invoiceId: string }> }) {
  try {
    enforceRequestSize(request, 8 * 1024);
    assertSameOrigin(request);

    const user = await requireUserApiContext();
    const params = await context.params;
    const invoiceId = sanitizeText(params.invoiceId);
    if (!invoiceId) {
      throw new AppError("Invalid invoice id", 400, "invalid_payload");
    }

    const { invoice, lines } = await getInvoiceForOwner(user.userId, invoiceId);
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("business_profiles")
      .select("invoice_prefix")
      .eq("profile_id", user.userId)
      .maybeSingle();

    const prefix = profile?.invoice_prefix ?? "INV-";
    const invoiceNumber = formatInvoiceNumber(prefix, new Date(), Math.floor(Math.random() * 9000) + 1000);

    const { data: duplicated } = await supabase
      .from("invoices")
      .insert({
        profile_id: user.userId,
        client_id: invoice.client_id,
        amount_cents: invoice.amount_cents,
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: invoice.due_date,
        status: "unpaid",
        lifecycle_status: "draft",
        invoice_number: invoiceNumber,
        client_company: invoice.client_company,
        billing_address_line1: invoice.billing_address_line1,
        billing_address_line2: invoice.billing_address_line2,
        billing_city: invoice.billing_city,
        billing_province_state: invoice.billing_province_state,
        billing_postal_code: invoice.billing_postal_code,
        billing_country: invoice.billing_country,
        currency: invoice.currency,
        tax_mode: invoice.tax_mode,
        discount_mode: invoice.discount_mode,
        discount_value: invoice.discount_value,
        subtotal_cents: invoice.subtotal_cents,
        tax_total_cents: invoice.tax_total_cents,
        discount_total_cents: invoice.discount_total_cents,
        grand_total_cents: invoice.grand_total_cents,
        amount_paid_cents: 0,
        amount_due_cents: invoice.grand_total_cents,
        payment_instructions: invoice.payment_instructions,
        footer: invoice.footer,
        notes: invoice.notes,
        public_token: generateInvoicePublicToken(),
      })
      .select("id,due_date")
      .single();

    if (!duplicated?.id) {
      throw new AppError("Invoice duplication failed", 500, "duplicate_failed");
    }

    await supabase.from("invoice_line_items").insert(
      lines.map((line, index) => ({
        profile_id: user.userId,
        invoice_id: duplicated.id,
        sort_order: index,
        description: line.description,
        qty: line.qty,
        unit_price_cents: line.unit_price_cents,
        line_total_cents: line.line_total_cents,
      })),
    );

    return NextResponse.json({ invoiceId: duplicated.id }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "invoices.duplicate");
  }
}
