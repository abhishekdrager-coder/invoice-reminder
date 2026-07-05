import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/types";

export const runtime = "nodejs";

function detectIntent(content: string) {
  const normalized = content.toLowerCase();
  if (["paid", "payment sent", "wire sent", "settled"].some((keyword) => normalized.includes(keyword))) {
    return "paid" as const;
  }
  if (["will pay", "pay by", "payment tomorrow", "next week"].some((keyword) => normalized.includes(keyword))) {
    return "promise_to_pay" as const;
  }
  if (["dispute", "incorrect", "issue", "not approved"].some((keyword) => normalized.includes(keyword))) {
    return "dispute" as const;
  }
  return "unknown" as const;
}

async function parsePayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, unknown>;
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

export async function POST(request: Request) {
  try {
    const payload = await parsePayload(request);
    const fromEmail = String(payload.from ?? payload.from_email ?? "");
    const subject = String(payload.subject ?? "");
    const body = String(payload.text ?? payload.body ?? payload.html ?? "");
    const invoiceId = String(payload.invoice_id ?? "");

    if (!fromEmail || (!invoiceId && !subject)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createAdminClient();
    let resolvedInvoiceId = invoiceId;

    if (!resolvedInvoiceId) {
      const match = subject.match(/INV-[A-Za-z0-9-]+/i);
      if (match) {
        const { data: invoice } = await supabase.from("invoices").select("id").eq("invoice_number", match[0]).maybeSingle();
        resolvedInvoiceId = invoice?.id ?? "";
      }
    }

    if (!resolvedInvoiceId) {
      return NextResponse.json({ error: "Unable to match invoice." }, { status: 404 });
    }

    const intent = detectIntent(`${subject}
${body}`);
    const { error } = await supabase.from("inbound_replies").insert({
      invoice_id: resolvedInvoiceId,
      from_email: fromEmail,
      subject,
      body,
      detected_intent: intent,
      raw_payload: JSON.parse(JSON.stringify(payload)) as Json,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (intent === "paid") {
      await supabase.from("invoices").update({ status: "paid" }).eq("id", resolvedInvoiceId);
      await supabase.from("reminders").update({ status: "skipped" }).eq("invoice_id", resolvedInvoiceId).is("sent_at", null);
    }

    return NextResponse.json({ success: true, intent });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook failed." }, { status: 500 });
  }
}
