import Stripe from "stripe";
import { env, requireStripeEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AppError } from "@/lib/errors/http";

export const STRIPE_ALLOWED_WEBHOOK_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export function verifyStripeWebhookEvent(body: string, signature: string) {
  const { STRIPE_WEBHOOK_SECRET } = requireStripeEnv();
  try {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET,
      env.STRIPE_WEBHOOK_TOLERANCE_SECONDS,
    );
  } catch {
    throw new AppError("Invalid signature", 400, "invalid_signature");
  }
}

export async function reserveWebhookEventId(eventId: string) {
  const admin = supabaseAdmin as unknown as {
    from: (table: string) => { insert: (value: Record<string, unknown>) => Promise<{ error?: { code?: string; message?: string } | null }> };
  };

  const { error } = await admin
    .from("stripe_webhook_events")
    .insert({ event_id: eventId, processed_at: new Date().toISOString() });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return false;
  }

  throw new AppError("Webhook persistence failed", 500, "webhook_store_error", {
    error: error.message,
  });
}
