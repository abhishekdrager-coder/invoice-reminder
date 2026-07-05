import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { env, requireCronEnv, requireEmailEnv } from "@/lib/env";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { withBackoff } from "@/lib/retries/backoff";
import { defaultReminderTemplate } from "@/lib/reminder-template";
import { PLAN_LIMITS, normalizePlan } from "@/lib/plans";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { logAppError } from "@/lib/logger";
import { assertAllowedCronIp } from "@/lib/request-security";

type ReminderWithRelations = {
  id: string;
  profile_id: string;
  idempotency_key: string;
  invoices: Array<{
    amount_cents: number;
    due_date: string;
    status: string;
    clients: Array<{
      name: string;
      email: string;
    }>;
  }>;
  profiles: Array<{
    default_tone: "polite" | "neutral" | "firm";
  }>;
};

type AdminQuery = {
  select: (columns: string, options?: { count?: string; head?: boolean }) => AdminQuery;
  update: (values: Record<string, unknown>) => AdminQuery;
  eq: (column: string, value: unknown) => AdminQuery;
  lte: (column: string, value: unknown) => AdminQuery;
  gte: (column: string, value: unknown) => AdminQuery;
  in: (column: string, values: unknown[]) => AdminQuery;
  is: (column: string, value: unknown) => AdminQuery;
  limit: (value: number) => Promise<{ data: unknown[] | null }>;
  maybeSingle: () => Promise<{ data: unknown | null; error?: { message: string } | null }>;
};

type AdminClient = {
  from: (table: string) => AdminQuery;
};

async function runCron(request: Request) {
  try {
    const { CRON_SECRET } = requireCronEnv();
    const { EMAIL_FROM } = requireEmailEnv();
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      throw new AppError("Unauthorized", 401, "unauthorized");
    }

    assertAllowedCronIp(request);

    const admin = supabaseAdmin as unknown as AdminClient;

    const nowIso = new Date().toISOString();
    const { data: dueReminders } = await admin
      .from("reminders")
      .select(
        "id,profile_id,idempotency_key,invoices(amount_cents,due_date,status,clients(name,email)),profiles(default_tone)",
      )
      .eq("status", "pending")
      .lte("scheduled_for", nowIso)
      .limit(100);

    const reminders = (dueReminders ?? []) as ReminderWithRelations[];
    const sent: string[] = [];
    const skipped: string[] = [];
    const blockedByPlan: string[] = [];
    const planCache = new Map<string, "free" | "premium_lite" | "premium_pro">();

    for (const reminder of reminders) {
      const { data: claimed, error: claimError } = await admin
        .from("reminders")
        .update({ status: "processing", processing_at: new Date().toISOString() })
        .eq("id", reminder.id)
        .eq("status", "pending")
        .is("processing_at", null)
        .select("id")
        .maybeSingle();

      if (claimError || !claimed) {
        if (claimError) {
          await logAppError({
            level: "warn",
            context: "cron.send_reminders",
            message: "Claim transition failed",
            profileId: reminder.profile_id,
            metadata: { reminderId: reminder.id, error: claimError.message },
          });
        }
        continue;
      }

      const invoice = reminder.invoices?.[0];
      const client = invoice?.clients?.[0];

      if (!invoice || !client || invoice.status !== "unpaid") {
        await admin
          .from("reminders")
          .update({ status: "skipped", failure_reason: "Invoice is not unpaid", processing_at: null })
          .eq("id", reminder.id)
          .eq("status", "processing");
        skipped.push(reminder.id);
        continue;
      }

      let plan = planCache.get(reminder.profile_id);
      if (!plan) {
        const { data: subData } = await admin
          .from("subscriptions")
          .select("plan,status")
          .eq("profile_id", reminder.profile_id)
          .in("status", ["active", "trialing"])
          .maybeSingle();

        const sub = (subData ?? null) as { plan?: string } | null;

        plan = normalizePlan(sub?.plan);
        planCache.set(reminder.profile_id, plan);
      }

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: sentThisMonth } = await (admin
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", reminder.profile_id)
        .eq("status", "sent")
        .gte("sent_at", monthStart) as unknown as Promise<{ count: number | null }>);

      if ((sentThisMonth ?? 0) >= PLAN_LIMITS[plan].remindersPerMonth) {
        await admin
          .from("reminders")
          .update({ status: "failed", failure_reason: "Monthly reminder limit reached. Upgrade: /settings/billing", processing_at: null })
          .eq("id", reminder.id)
          .eq("status", "processing");
        skipped.push(reminder.id);
        blockedByPlan.push(reminder.profile_id);
        continue;
      }

      const templated = defaultReminderTemplate({
        clientName: client.name,
        amountCents: invoice.amount_cents,
        dueDate: invoice.due_date,
      });

      const tone = reminder.profiles?.[0]?.default_tone ?? "neutral";

      const ai = await openai.responses.create({
        model: env.OPENAI_MODEL,
        input: [
          {
            role: "system",
            content: "Rewrite reminder email with chosen tone. Keep amount and due date unchanged. Return plain text only.",
          },
          {
            role: "user",
            content: `Tone: ${tone}\n\n${templated.body}`,
          },
        ],
      });

      const body = ai.output_text.trim() || templated.body;

      const { error: emailError } = await withBackoff(
        () =>
          resend.emails.send({
            from: EMAIL_FROM,
            to: [client.email],
            subject: templated.subject,
            text: body,
            headers: {
              "x-idempotency-key": reminder.idempotency_key,
            },
          }),
        2,
        250,
      );

      if (emailError) {
        await logAppError({
          level: "error",
          context: "cron.send_reminders",
          message: "Email send failed",
          profileId: reminder.profile_id,
          metadata: { reminderId: reminder.id, error: emailError.message },
        });
        await admin
          .from("reminders")
          .update({ status: "failed", failure_reason: emailError.message, processing_at: null })
          .eq("id", reminder.id)
          .eq("status", "processing");
        continue;
      }

      const { error: updateError } = await (admin
        .from("reminders")
        .update({ status: "sent", sent_at: new Date().toISOString(), final_subject: templated.subject, final_body: body, processing_at: null })
        .eq("id", reminder.id)
        .eq("status", "processing") as unknown as Promise<{ error?: { message: string } | null }>);

      if (!updateError) {
        sent.push(reminder.id);
      } else {
        await logAppError({
          level: "error",
          context: "cron.send_reminders",
          message: "Failed to finalize sent reminder",
          profileId: reminder.profile_id,
          metadata: { reminderId: reminder.id, error: updateError.message },
        });
      }
    }

    return NextResponse.json({
      sent: sent.length,
      skipped: skipped.length,
      blocked: blockedByPlan.length,
      upgradeHint: blockedByPlan.length > 0 ? "/settings/billing" : null,
    });
  } catch (error) {
    return handleRouteError(error, "cron.send_reminders");
  }
}

export async function POST(request: Request) {
  return runCron(request);
}

export async function GET(request: Request) {
  return runCron(request);
}
