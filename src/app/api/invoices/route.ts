import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { createClient } from "@/lib/supabase-server";
import { buildUpgradeHint, checkInvoiceLimit } from "@/lib/quota";
import { handleRouteError, AppError } from "@/lib/errors/http";
import { invoiceCreateSchema, invoiceSchema, invoiceStatusUpdateSchema } from "@/lib/validation";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { buildReminderSchedule } from "@/lib/reminder-schedule";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import { parseInvoiceSequence, formatInvoiceNumber } from "@/lib/invoice-number";
import { generateInvoicePublicToken } from "@/lib/invoice-token";
import { resolveLifecycleStatus } from "@/lib/invoice-status";

async function nextInvoiceNumber(userId: string, issueDate: string, prefix: string) {
  const supabase = await createClient();
  const monthStart = new Date(issueDate);
  monthStart.setDate(1);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("profile_id", userId)
    .gte("issue_date", monthStart.toISOString().slice(0, 10))
    .lt("issue_date", monthEnd.toISOString().slice(0, 10))
    .not("invoice_number", "is", null)
    .limit(300);

  const max = (data ?? []).reduce((currentMax, row) => {
    const value = parseInvoiceSequence(String(row.invoice_number ?? ""), prefix, issueDate);
    return Math.max(currentMax, value);
  }, 0);

  return formatInvoiceNumber(prefix, issueDate, max + 1);
}

async function ensureClient(userId: string, clientName: string, clientEmail: string) {
  const supabase = await createClient();
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", userId)
    .eq("email", clientEmail)
    .maybeSingle();

  if (existingClient?.id) return existingClient.id;

  const { data: createdClient } = await supabase
    .from("clients")
    .insert({ profile_id: userId, name: clientName, email: clientEmail })
    .select("id")
    .single();

  if (!createdClient?.id) {
    throw new AppError("Client creation failed", 500, "client_create_failed");
  }

  return createdClient.id;
}

async function upsertOverdueInvoices(userId: string) {
  const supabase = await createClient();
  await supabase
    .from("invoices")
    .update({ lifecycle_status: "overdue" })
    .eq("profile_id", userId)
    .lt("due_date", new Date().toISOString().slice(0, 10))
    .gt("amount_due_cents", 0)
    .in("lifecycle_status", ["draft", "sent", "viewed", "partially_paid"])
    .neq("lifecycle_status", "canceled");
}

export async function GET() {
  try {
    const user = await requireUserApiContext();
    try {
      await upsertOverdueInvoices(user.userId);
    } catch {
      // Keep listing resilient even if overdue maintenance cannot run.
    }
    const supabase = await createClient();

    const { data } = await supabase
      .from("invoices")
      .select("id,issue_date,due_date,status,lifecycle_status,invoice_number,currency,subtotal_cents,tax_total_cents,discount_total_cents,grand_total_cents,amount_paid_cents,amount_due_cents,view_count,public_token,notes,payment_instructions,clients(name,email)")
      .eq("profile_id", user.userId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ invoices: data ?? [] });
  } catch (error) {
    return handleRouteError(error, "invoices.get");
  }
}

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 32 * 1024);
    assertSameOrigin(request);
    const user = await requireUserApiContext();
    const body = await request.json();

    const parsedFull = invoiceCreateSchema.safeParse({
      clientName: sanitizeText(body.clientName),
      clientEmail: sanitizeEmail(body.clientEmail),
      clientCompany: sanitizeText(body.clientCompany ?? ""),
      billingAddressLine1: sanitizeText(body.billingAddressLine1 ?? ""),
      billingAddressLine2: sanitizeText(body.billingAddressLine2 ?? ""),
      billingCity: sanitizeText(body.billingCity ?? ""),
      billingProvinceState: sanitizeText(body.billingProvinceState ?? ""),
      billingPostalCode: sanitizeText(body.billingPostalCode ?? ""),
      billingCountry: sanitizeText(body.billingCountry ?? ""),
      issueDate: body.issueDate,
      dueDate: body.dueDate,
      currency: sanitizeText(body.currency ?? "USD"),
      taxMode: body.taxMode,
      discountMode: body.discountMode,
      discountValue: body.discountValue,
      amountPaidCents: body.amountPaidCents,
      notes: sanitizeText(body.notes ?? ""),
      footer: sanitizeText(body.footer ?? ""),
      paymentInstructions: sanitizeText(body.paymentInstructions ?? ""),
      lifecycleStatus: body.lifecycleStatus,
      lineItems: Array.isArray(body.lineItems)
        ? body.lineItems.map((line: { description?: string; qty?: unknown; unitPriceCents?: unknown; taxRatePercent?: unknown }) => ({
            description: sanitizeText(line.description),
            qty: line.qty,
            unitPriceCents: line.unitPriceCents,
            taxRatePercent: line.taxRatePercent,
          }))
        : undefined,
    });

    const parsedLegacy = invoiceSchema.safeParse({
      clientName: sanitizeText(body.clientName),
      clientEmail: sanitizeEmail(body.clientEmail),
      amount: body.amount,
      dueDate: body.dueDate,
      invoiceNumber: sanitizeText(body.invoiceNumber ?? ""),
      notes: sanitizeText(body.notes ?? ""),
    });

    const supabase = await createClient();
    let businessProfile:
      | {
          invoice_prefix: string | null;
          default_currency: string | null;
          default_tax_rate_percent: number | null;
          default_footer: string | null;
          payment_instructions: string | null;
        }
      | null = null;
    try {
      const { data } = await supabase
        .from("business_profiles")
        .select("invoice_prefix,default_currency,default_tax_rate_percent,default_footer,payment_instructions")
        .eq("profile_id", user.userId)
        .maybeSingle();
      businessProfile = data ?? null;
    } catch {
      businessProfile = null;
    }

    if (!parsedFull.success && !parsedLegacy.success) {
      throw new AppError("Invalid invoice payload", 400, "invalid_payload");
    }

    const legacyData = parsedLegacy.success ? parsedLegacy.data : null;

    const normalized = parsedFull.success
      ? parsedFull.data
      : {
          clientName: legacyData?.clientName ?? "",
          clientEmail: legacyData?.clientEmail ?? "",
          clientCompany: "",
          billingAddressLine1: "",
          billingAddressLine2: "",
          billingCity: "",
          billingProvinceState: "",
          billingPostalCode: "",
          billingCountry: "",
          issueDate: new Date().toISOString().slice(0, 10),
          dueDate: legacyData?.dueDate ?? new Date().toISOString().slice(0, 10),
          currency: businessProfile?.default_currency ?? "USD",
          taxMode: "exclusive" as const,
          discountMode: "fixed" as const,
          discountValue: 0,
          amountPaidCents: 0,
          notes: legacyData?.notes ?? "",
          footer: businessProfile?.default_footer ?? "",
          paymentInstructions: businessProfile?.payment_instructions ?? "",
          lifecycleStatus: "draft" as const,
          lineItems: [{ description: legacyData?.invoiceNumber || "Invoice service", qty: 1, unitPriceCents: Math.round((legacyData?.amount ?? 0) * 100), taxRatePercent: businessProfile?.default_tax_rate_percent ?? 0 }],
        };

    const limitCheck = await checkInvoiceLimit(user.userId, 1);
    if (!limitCheck.allowed) {
      throw new AppError("Plan invoice limit reached", 403, "plan_limit_reached", {
        ...buildUpgradeHint("invoices"),
        usage: {
          current: limitCheck.current,
          limit: limitCheck.limit,
          plan: limitCheck.plan,
        },
      });
    }

    const clientId = await ensureClient(user.userId, normalized.clientName, normalized.clientEmail);

    const totals = calculateInvoiceTotals({
      lines: normalized.lineItems.map((line) => ({
        description: line.description,
        qty: line.qty,
        unitPriceCents: line.unitPriceCents,
        taxRatePercent: line.taxRatePercent,
      })),
      defaultTaxRatePercent: businessProfile?.default_tax_rate_percent ?? 0,
      taxMode: normalized.taxMode,
      discountMode: normalized.discountMode,
      discountValue: normalized.discountValue,
      amountPaidCents: normalized.amountPaidCents,
    });

    const prefix = businessProfile?.invoice_prefix ?? "INV-";
    const generatedInvoiceNumber = parsedLegacy.success && parsedLegacy.data.invoiceNumber
      ? parsedLegacy.data.invoiceNumber
      : await nextInvoiceNumber(user.userId, normalized.issueDate, prefix);

    const paymentStatus = totals.amountDueCents <= 0 ? "paid" : "unpaid";
    const lifecycleStatus = resolveLifecycleStatus({
      lifecycleStatus: normalized.lifecycleStatus,
      paymentStatus,
      dueDate: normalized.dueDate,
      amountDueCents: totals.amountDueCents,
    });
    const publicToken = generateInvoicePublicToken();

    const { data: invoice } = await supabase
      .from("invoices")
      .insert({
        profile_id: user.userId,
        client_id: clientId,
        amount_cents: totals.grandTotalCents,
        issue_date: normalized.issueDate,
        due_date: normalized.dueDate,
        status: paymentStatus,
        lifecycle_status: lifecycleStatus,
        invoice_number: generatedInvoiceNumber,
        client_company: normalized.clientCompany || null,
        billing_address_line1: normalized.billingAddressLine1 || null,
        billing_address_line2: normalized.billingAddressLine2 || null,
        billing_city: normalized.billingCity || null,
        billing_province_state: normalized.billingProvinceState || null,
        billing_postal_code: normalized.billingPostalCode || null,
        billing_country: normalized.billingCountry || null,
        currency: normalized.currency,
        tax_mode: normalized.taxMode,
        discount_mode: normalized.discountMode,
        discount_value: normalized.discountValue,
        subtotal_cents: totals.subtotalCents,
        tax_total_cents: totals.taxTotalCents,
        discount_total_cents: totals.discountTotalCents,
        grand_total_cents: totals.grandTotalCents,
        amount_paid_cents: totals.amountPaidCents,
        amount_due_cents: totals.amountDueCents,
        payment_instructions: normalized.paymentInstructions || null,
        footer: normalized.footer || null,
        public_token: publicToken,
        notes: normalized.notes || null,
      })
      .select("id,due_date")
      .single();

    if (!invoice) {
      throw new AppError("Invoice creation failed", 500, "invoice_create_failed");
    }

    await supabase.from("invoice_line_items").insert(
      normalized.lineItems.map((line, index) => ({
        profile_id: user.userId,
        invoice_id: invoice.id,
        sort_order: index,
        description: line.description,
        qty: line.qty,
        unit_price_cents: line.unitPriceCents,
        tax_rate_percent: line.taxRatePercent ?? null,
        line_total_cents: totals.lineTotals[index]?.lineTotalCents ?? line.qty * line.unitPriceCents,
      })),
    );

    await supabase.from("invoice_events").insert({
      profile_id: user.userId,
      invoice_id: invoice.id,
      event_type: "invoice_created",
      metadata: { lifecycleStatus },
    });

    if (lifecycleStatus !== "canceled" && paymentStatus === "unpaid") {
      await supabase.from("reminders").insert(
        buildReminderSchedule(invoice.due_date).map((entry) => ({
          profile_id: user.userId,
          invoice_id: invoice.id,
          scheduled_for: entry.scheduledFor,
          status: "pending",
          idempotency_key: `${invoice.id}:${entry.dayOffset}`,
        })),
      );
    }

    return NextResponse.json({ invoiceId: invoice.id, publicToken }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "invoices.post");
  }
}

export async function PATCH(request: Request) {
  try {
    enforceRequestSize(request, 16 * 1024);
    assertSameOrigin(request);
    const user = await requireUserApiContext();
    const body = await request.json();
    const parsed = invoiceStatusUpdateSchema.safeParse({
      invoiceId: sanitizeText(body.invoiceId),
      lifecycleStatus: body.lifecycleStatus,
      amountPaidCents: body.amountPaidCents,
      paymentStatus: body.paymentStatus,
    });

    if (!parsed.success) {
      throw new AppError("Invalid payload", 400, "invalid_payload");
    }

    const invoiceId = parsed.data.invoiceId;

    const supabase = await createClient();
    const { data: invoice, count } = await supabase
      .from("invoices")
      .select("id,due_date,amount_paid_cents,grand_total_cents,lifecycle_status,status", { count: "exact" })
      .eq("id", invoiceId)
      .eq("profile_id", user.userId)
      .maybeSingle();

    if (!count || !invoice) {
      throw new AppError("Invoice not found", 404, "not_found");
    }

    const amountPaidCents = parsed.data.amountPaidCents ?? invoice.amount_paid_cents ?? 0;
    const amountDueCents = Math.max(0, (invoice.grand_total_cents ?? 0) - amountPaidCents);

    const paymentStatus = parsed.data.paymentStatus
      ?? (amountDueCents <= 0 ? "paid" : amountPaidCents > 0 ? "unpaid" : invoice.status);

    const lifecycleStatus = parsed.data.lifecycleStatus
      ?? resolveLifecycleStatus({
        lifecycleStatus: invoice.lifecycle_status,
        paymentStatus,
        dueDate: invoice.due_date,
        amountDueCents,
      });

    await supabase
      .from("invoices")
      .update({
        status: paymentStatus,
        lifecycle_status: lifecycleStatus,
        amount_paid_cents: amountPaidCents,
        amount_due_cents: amountDueCents,
        paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
        canceled_at: lifecycleStatus === "canceled" ? new Date().toISOString() : null,
      })
      .eq("id", invoiceId)
      .eq("profile_id", user.userId);

    await supabase.from("invoice_events").insert({
      profile_id: user.userId,
      invoice_id: invoiceId,
      event_type: "invoice_status_updated",
      metadata: {
        paymentStatus,
        lifecycleStatus,
        amountPaidCents,
        amountDueCents,
      },
    });

    if (paymentStatus === "paid" || paymentStatus === "disputed" || lifecycleStatus === "canceled") {
      await supabase
        .from("reminders")
        .update({ status: "skipped", failure_reason: `Invoice status changed to ${paymentStatus}/${lifecycleStatus}` })
        .eq("invoice_id", invoiceId)
        .eq("profile_id", user.userId)
        .eq("status", "pending");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "invoices.patch");
  }
}
