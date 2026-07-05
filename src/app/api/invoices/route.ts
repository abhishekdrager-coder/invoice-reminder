import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { createClient } from "@/lib/supabase-server";
import { buildUpgradeHint, checkInvoiceLimit } from "@/lib/quota";
import { handleRouteError, AppError } from "@/lib/errors/http";
import { invoiceSchema } from "@/lib/validation";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { buildReminderSchedule } from "@/lib/reminder-schedule";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";

export async function GET() {
  try {
    const user = await requireUserApiContext();
    const supabase = await createClient();

    const { data } = await supabase
      .from("invoices")
      .select("id,amount_cents,due_date,status,invoice_number,notes,clients(name,email)")
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

    const parsed = invoiceSchema.safeParse({
      clientName: sanitizeText(body.clientName),
      clientEmail: sanitizeEmail(body.clientEmail),
      amount: body.amount,
      dueDate: body.dueDate,
      invoiceNumber: sanitizeText(body.invoiceNumber ?? ""),
      notes: sanitizeText(body.notes ?? ""),
    });

    if (!parsed.success) {
      throw new AppError("Invalid invoice payload", 400, "invalid_payload");
    }

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

    const supabase = await createClient();
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("profile_id", user.userId)
      .eq("email", parsed.data.clientEmail)
      .maybeSingle();

    let clientId = existingClient?.id;

    if (!clientId) {
      const { data: createdClient } = await supabase
        .from("clients")
        .insert({ profile_id: user.userId, name: parsed.data.clientName, email: parsed.data.clientEmail })
        .select("id")
        .single();
      clientId = createdClient?.id;
    }

    if (!clientId) {
      throw new AppError("Client creation failed", 500, "client_create_failed");
    }

    const { data: invoice } = await supabase
      .from("invoices")
      .insert({
        profile_id: user.userId,
        client_id: clientId,
        amount_cents: Math.round(parsed.data.amount * 100),
        due_date: parsed.data.dueDate,
        status: "unpaid",
        invoice_number: parsed.data.invoiceNumber || null,
        notes: parsed.data.notes || null,
      })
      .select("id,due_date")
      .single();

    if (!invoice) {
      throw new AppError("Invoice creation failed", 500, "invoice_create_failed");
    }

    await supabase.from("reminders").insert(
      buildReminderSchedule(invoice.due_date).map((entry) => ({
        profile_id: user.userId,
        invoice_id: invoice.id,
        scheduled_for: entry.scheduledFor,
        status: "pending",
        idempotency_key: `${invoice.id}:${entry.dayOffset}`,
      })),
    );

    return NextResponse.json({ invoiceId: invoice.id }, { status: 201 });
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
    const invoiceId = sanitizeText(body.invoiceId);
    const status = sanitizeText(body.status);

    if (!invoiceId || !["paid", "unpaid", "disputed"].includes(status)) {
      throw new AppError("Invalid payload", 400, "invalid_payload");
    }

    const supabase = await createClient();
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("id", invoiceId)
      .eq("profile_id", user.userId);

    if (!count) {
      throw new AppError("Invoice not found", 404, "not_found");
    }

    await supabase
      .from("invoices")
      .update({
        status,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", invoiceId)
      .eq("profile_id", user.userId);

    if (status === "paid" || status === "disputed") {
      await supabase
        .from("reminders")
        .update({ status: "skipped", failure_reason: `Invoice status changed to ${status}` })
        .eq("invoice_id", invoiceId)
        .eq("profile_id", user.userId)
        .eq("status", "pending");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "invoices.patch");
  }
}
