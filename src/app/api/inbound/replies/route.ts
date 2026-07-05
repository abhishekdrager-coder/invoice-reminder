import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { detectIntent } from "@/lib/intent";
import { inboundReplySchema } from "@/lib/validation";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${env.INBOUND_SECRET}`) {
      throw new AppError("Unauthorized", 401, "unauthorized");
    }

    const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const gate = checkRateLimit(`inbound:${ip}`, 40, 60_000);
    if (!gate.allowed) {
      throw new AppError("Rate limit exceeded", 429, "rate_limit");
    }

    const parsed = inboundReplySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid inbound payload", 400, "invalid_payload");
    }

    const admin = supabaseAdmin as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: unknown) => { single: () => Promise<{ data: { id: string } | null }> };
        };
        insert: (value: Record<string, unknown>) => Promise<unknown>;
        update: (value: Record<string, unknown>) => {
          eq: (column: string, value: unknown) => {
            eq: (column: string, value: unknown) => Promise<unknown>;
          };
        };
      };
    };

    const { data: invoice } = await admin
      .from("invoices")
      .select("id")
      .eq("id", parsed.data.invoiceId)
      .single();

    if (!invoice) {
      throw new AppError("Invoice not found", 404, "invoice_not_found");
    }

    const intent = detectIntent(parsed.data.text);

    await admin.from("inbound_replies").insert({
      invoice_id: parsed.data.invoiceId,
      from_email: parsed.data.fromEmail ?? null,
      body_text: parsed.data.text,
      intent,
    });

    await admin
      .from("reminders")
      .update({ intent_outcome: intent })
      .eq("invoice_id", parsed.data.invoiceId)
      .eq("status", "sent");

    if (intent === "paid") {
      await admin
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", parsed.data.invoiceId);

      await admin
        .from("reminders")
        .update({ status: "skipped", failure_reason: "Auto-stopped after paid reply" })
        .eq("invoice_id", parsed.data.invoiceId)
        .eq("status", "pending");
    }

    return NextResponse.json({ intent });
  } catch (error) {
    return handleRouteError(error, "inbound.replies");
  }
}
