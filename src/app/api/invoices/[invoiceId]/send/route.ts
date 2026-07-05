import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { buildInvoiceEmailSubject, buildInvoiceEmailText } from "@/lib/invoice-email";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { getInvoiceForOwner } from "@/lib/invoice-repository";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { getResendClient } from "@/lib/resend";
import { sanitizeText } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase-server";
import { env, requireEmailEnv } from "@/lib/env";

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

    const { invoice, lines, business } = await getInvoiceForOwner(user.userId, invoiceId);
    const clientEmail = invoice.clients?.[0]?.email;
    if (!clientEmail) {
      throw new AppError("Client email missing", 400, "client_email_missing");
    }

    const { EMAIL_FROM } = requireEmailEnv();
    const resend = getResendClient();

    const pdfBuffer = await buildInvoicePdf({
      business: {
        displayBusinessName: business?.display_business_name,
        legalBusinessName: business?.legal_business_name,
        ownerFullName: business?.owner_full_name,
        businessEmail: business?.business_email,
        businessPhone: business?.business_phone,
        website: business?.website,
        addressLine1: business?.address_line1,
        addressLine2: business?.address_line2,
        city: business?.city,
        provinceState: business?.province_state,
        postalCode: business?.postal_code,
        country: business?.country,
        brandAccentColor: business?.brand_accent_color,
      },
      invoice: {
        invoiceNumber: invoice.invoice_number ?? invoice.id,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        lifecycleStatus: invoice.lifecycle_status,
        currency: invoice.currency,
        clientName: invoice.clients?.[0]?.name ?? "Client",
        clientEmail,
        clientCompany: invoice.client_company,
        notes: invoice.notes,
        footer: invoice.footer,
        paymentInstructions: invoice.payment_instructions,
        subtotalCents: invoice.subtotal_cents,
        taxTotalCents: invoice.tax_total_cents,
        discountTotalCents: invoice.discount_total_cents,
        grandTotalCents: invoice.grand_total_cents,
        amountDueCents: invoice.amount_due_cents,
      },
      lines: lines.map((line) => ({
        description: line.description,
        qty: line.qty,
        unitPriceCents: line.unit_price_cents,
        lineTotalCents: line.line_total_cents,
      })),
    });

    const secureLink = `${env.NEXT_PUBLIC_APP_URL}/i/${invoice.public_token}`;
    const subject = buildInvoiceEmailSubject({
      invoiceNumber: invoice.invoice_number ?? invoice.id,
      businessName: business?.display_business_name ?? business?.legal_business_name ?? "NudgePay",
      currency: invoice.currency,
      amountDueCents: invoice.amount_due_cents,
      dueDate: invoice.due_date,
      secureLink,
      fromLabel: EMAIL_FROM,
    });
    const text = buildInvoiceEmailText({
      invoiceNumber: invoice.invoice_number ?? invoice.id,
      businessName: business?.display_business_name ?? business?.legal_business_name ?? "NudgePay",
      currency: invoice.currency,
      amountDueCents: invoice.amount_due_cents,
      dueDate: invoice.due_date,
      secureLink,
      fromLabel: EMAIL_FROM,
    });

    const sendResult = await resend.emails.send({
      from: EMAIL_FROM,
      to: [clientEmail],
      subject,
      text,
      attachments: [
        {
          filename: `invoice-${invoice.invoice_number ?? invoice.id}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    const supabase = await createClient();
    await supabase
      .from("invoices")
      .update({
        lifecycle_status: invoice.lifecycle_status === "draft" ? "sent" : invoice.lifecycle_status,
        sent_at: invoice.sent_at ?? new Date().toISOString(),
        last_email_sent_at: new Date().toISOString(),
        email_delivery_status: sendResult.error ? "failed" : "sent",
      })
      .eq("id", invoice.id)
      .eq("profile_id", user.userId);

    await supabase.from("invoice_events").insert({
      profile_id: user.userId,
      invoice_id: invoice.id,
      event_type: "invoice_sent",
      metadata: {
        to: clientEmail,
        resendId: sendResult.data?.id ?? null,
        status: sendResult.error ? "failed" : "sent",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "invoices.send");
  }
}
