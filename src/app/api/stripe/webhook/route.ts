import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireStripeEnv } from "@/lib/env";
import { handleRouteError } from "@/lib/errors/http";
import { logAppError } from "@/lib/logger";
import {
  reserveWebhookEventId,
  STRIPE_ALLOWED_WEBHOOK_EVENTS,
  verifyStripeWebhookEvent,
} from "@/lib/stripe-webhook-security";
import { supabaseAdmin } from "@/lib/supabase-admin";

function mapPriceIdToPlan(priceId: string | null | undefined) {
  const { STRIPE_PREMIUM_PRO_PRICE_ID, STRIPE_PREMIUM_LITE_PRICE_ID } = requireStripeEnv();
  if (priceId === STRIPE_PREMIUM_PRO_PRICE_ID) return "premium_pro";
  if (priceId === STRIPE_PREMIUM_LITE_PRICE_ID) return "premium_lite";
  return "free";
}

export async function POST(request: Request) {
  try {
    const admin = supabaseAdmin as unknown as {
      from: (table: string) => {
        upsert: (value: Record<string, unknown>) => Promise<{ error?: { message: string } | null }>;
        update: (value: Record<string, unknown>) => {
          eq: (column: string, value: unknown) => Promise<{ error?: { message: string } | null }>;
        };
      };
    };

    const body = await request.text();
    const signature = (await headers()).get("stripe-signature");

    if (!signature) {
      await logAppError({ level: "warn", context: "stripe.webhook", message: "Missing stripe signature" });
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = verifyStripeWebhookEvent(body, signature);
    } catch {
      await logAppError({ level: "warn", context: "stripe.webhook", message: "Invalid stripe signature" });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (!STRIPE_ALLOWED_WEBHOOK_EVENTS.has(event.type)) {
      return NextResponse.json({ ignored: true }, { status: 200 });
    }

    const firstSeen = await reserveWebhookEventId(event.id);
    if (!firstSeen) {
      await logAppError({ level: "warn", context: "stripe.webhook", message: "Replay event ignored", metadata: { eventId: event.id } });
      return NextResponse.json({ replay: true }, { status: 200 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const profileId = session.metadata?.profile_id;
      const plan = session.metadata?.plan === "premium_pro" ? "premium_pro" : session.metadata?.plan === "premium_lite" ? "premium_lite" : "free";

      if (profileId) {
        const { error } = await admin.from("subscriptions").upsert({
          profile_id: profileId,
          user_id: profileId,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
          stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
          plan,
          status: "active",
        });
        if (error) {
          await logAppError({
            level: "error",
            context: "stripe.webhook",
            message: "Failed to upsert checkout subscription",
            profileId,
            metadata: { error: error.message },
          });
        }
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const status = sub.status;
      const periodEndUnix = Number((sub as unknown as { current_period_end?: number }).current_period_end ?? 0);
      const item = sub.items?.data?.[0];
      const nextPlan = event.type === "customer.subscription.deleted"
        ? "free"
        : mapPriceIdToPlan(item?.price?.id);

      const { error } = await admin
        .from("subscriptions")
        .update({
          status,
          plan: nextPlan,
          current_period_end: periodEndUnix > 0 ? new Date(periodEndUnix * 1000).toISOString() : null,
        })
        .eq("stripe_subscription_id", sub.id);
      if (error) {
        await logAppError({
          level: "error",
          context: "stripe.webhook",
          message: "Failed to update subscription status",
          metadata: { subscriptionId: sub.id, error: error.message },
        });
      }
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
      await logAppError({
        level: event.type === "invoice.payment_failed" ? "warn" : "info",
        context: "stripe.webhook",
        message: event.type,
        metadata: {
          eventId: event.id,
          invoiceId: invoice.id,
          customer: invoice.customer,
          subscription,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return handleRouteError(error, "stripe.webhook");
  }
}
