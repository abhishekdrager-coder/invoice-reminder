import { NextResponse } from "next/server";

import { rewriteEmailTone } from "@/lib/openai";
import { sendReminderEmail } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export const runtime = "nodejs";

type PendingReminderRecord = {
  id: string;
  invoice_id: string;
  step_id: string;
  scheduled_at: string;
  sent_at: string | null;
  status: string;
  invoices: {
    id: string;
    user_id: string;
    invoice_number: string;
    amount: number;
    currency: string;
    due_date: string;
    status: string;
    clients: {
      name: string;
      email: string;
    } | null;
  } | null;
  reminder_steps: {
    subject_template: string;
    body_template: string;
    tone: "polite" | "neutral" | "firm";
  } | null;
};

function hydrateTemplate(template: string, reminder: PendingReminderRecord) {
  return template
    .replaceAll("{{invoice_number}}", reminder.invoices?.invoice_number ?? "")
    .replaceAll("{{client_name}}", reminder.invoices?.clients?.name ?? "there")
    .replaceAll("{{amount}}", formatCurrency(Number(reminder.invoices?.amount ?? 0), reminder.invoices?.currency ?? "USD"))
    .replaceAll("{{due_date}}", formatDate(reminder.invoices?.due_date ?? new Date().toISOString()))
    .replaceAll("{{sender_name}}", "Invoice Copilot");
}

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reminders")
    .select(`id, invoice_id, step_id, scheduled_at, sent_at, status,
      invoices(id, user_id, invoice_number, amount, currency, due_date, status, clients(name, email)),
      reminder_steps(subject_template, body_template, tone)`)
    .eq("status", "pending")
    .is("sent_at", null)
    .lte("scheduled_at", new Date().toISOString())
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reminders = (data ?? []) as unknown as PendingReminderRecord[];
  const results: Array<{ id: string; status: string; message?: string }> = [];

  for (const reminder of reminders) {
    if (!reminder.invoices || !reminder.reminder_steps || !reminder.invoices.clients) {
      await supabase.from("reminders").update({ status: "failed" }).eq("id", reminder.id).is("sent_at", null);
      results.push({ id: reminder.id, status: "failed", message: "Missing invoice context." });
      continue;
    }

    if (reminder.invoices.status === "paid" || reminder.invoices.status === "disputed") {
      await supabase.from("reminders").update({ status: "skipped" }).eq("id", reminder.id).is("sent_at", null);
      results.push({ id: reminder.id, status: "skipped" });
      continue;
    }

    try {
      const rawSubject = hydrateTemplate(reminder.reminder_steps.subject_template, reminder);
      const rawBody = hydrateTemplate(reminder.reminder_steps.body_template, reminder);
      const rewritten = await rewriteEmailTone({
        userId: reminder.invoices.user_id,
        subject: rawSubject,
        body: rawBody,
        tone: reminder.reminder_steps.tone,
        enforceRateLimit: false,
      });

      const html = rewritten.body.replace(/\n/g, "<br />");
      await sendReminderEmail({
        to: reminder.invoices.clients.email,
        subject: rewritten.subject,
        html,
        text: rewritten.body,
      });

      await supabase
        .from("reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", reminder.id)
        .is("sent_at", null);

      results.push({ id: reminder.id, status: "sent" });
    } catch (sendError) {
      await supabase.from("reminders").update({ status: "failed" }).eq("id", reminder.id).is("sent_at", null);
      results.push({ id: reminder.id, status: "failed", message: sendError instanceof Error ? sendError.message : "Unknown error" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
