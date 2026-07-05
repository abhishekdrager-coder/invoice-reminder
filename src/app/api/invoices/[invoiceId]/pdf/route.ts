import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { getInvoiceForOwner } from "@/lib/invoice-repository";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { sanitizeText } from "@/lib/sanitize";

export async function GET(_: Request, context: { params: Promise<{ invoiceId: string }> }) {
  try {
    const user = await requireUserApiContext();
    const params = await context.params;
    const invoiceId = sanitizeText(params.invoiceId);
    if (!invoiceId) {
      throw new AppError("Invalid invoice id", 400, "invalid_payload");
    }

    const { invoice, lines, business } = await getInvoiceForOwner(user.userId, invoiceId);
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
        clientEmail: invoice.clients?.[0]?.email ?? "",
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

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename=invoice-${invoice.invoice_number ?? invoice.id}.pdf`,
      },
    });
  } catch (error) {
    return handleRouteError(error, "invoices.pdf");
  }
}
