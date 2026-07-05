import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { createClient } from "@/lib/supabase-server";
import { buildUpgradeHint, checkInvoiceLimit } from "@/lib/quota";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { buildReminderSchedule } from "@/lib/reminder-schedule";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { csvInvoiceSchema } from "@/lib/validation";

type Payload = { rows: unknown[] };

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 512 * 1024);
    assertSameOrigin(request);
    const body = (await request.json()) as Payload;
    const userContext = await requireUserApiContext();
    const supabase = await createClient();

    if (!Array.isArray(body.rows)) {
      throw new AppError("rows must be an array", 400, "invalid_payload");
    }

    const parsedRows = body.rows
      .map((row) =>
        csvInvoiceSchema.safeParse({
          ...(typeof row === "object" && row ? row : {}),
          clientName: sanitizeText((row as { clientName?: unknown })?.clientName),
          clientEmail: sanitizeEmail((row as { clientEmail?: unknown })?.clientEmail),
          invoiceNumber: sanitizeText((row as { invoiceNumber?: unknown })?.invoiceNumber ?? ""),
          notes: sanitizeText((row as { notes?: unknown })?.notes ?? ""),
        }),
      )
      .filter((row) => row.success)
      .map((row) => row.data);

    if (parsedRows.length === 0) {
      throw new AppError("No valid rows in CSV", 400, "invalid_csv");
    }

    const limitCheck = await checkInvoiceLimit(userContext.userId, parsedRows.length);
    if (!limitCheck.allowed) {
      throw new AppError(`Plan limit reached (${limitCheck.current}/${limitCheck.limit})`, 403, "plan_limit", {
        ...buildUpgradeHint("invoices"),
        usage: {
          current: limitCheck.current,
          limit: limitCheck.limit,
          plan: limitCheck.plan,
        },
      });
    }

    let inserted = 0;

    for (const row of parsedRows) {
      let clientId: string;

      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("profile_id", userContext.userId)
        .eq("email", row.clientEmail)
        .maybeSingle();

      if (client?.id) {
        clientId = client.id;
      } else {
        const { data: newClient } = await supabase
          .from("clients")
          .insert({ profile_id: userContext.userId, name: row.clientName, email: row.clientEmail })
          .select("id")
          .single();

        if (!newClient?.id) continue;
        clientId = newClient.id;
      }

      const { data: invoice } = await supabase
        .from("invoices")
        .insert({
          profile_id: userContext.userId,
          client_id: clientId,
          amount_cents: Math.round(row.amount * 100),
          due_date: row.dueDate,
          status: "unpaid",
          invoice_number: row.invoiceNumber || null,
          notes: row.notes || null,
        })
        .select("id,due_date")
        .single();

      if (!invoice?.id) continue;

      inserted += 1;

      await supabase.from("reminders").insert(
        buildReminderSchedule(invoice.due_date).map((entry) => ({
          profile_id: userContext.userId,
          invoice_id: invoice.id,
          scheduled_for: entry.scheduledFor,
          status: "pending",
          idempotency_key: `${invoice.id}:${entry.dayOffset}`,
        })),
      );
    }

    return NextResponse.json({ inserted });
  } catch (error) {
    return handleRouteError(error, "invoices.import");
  }
}
