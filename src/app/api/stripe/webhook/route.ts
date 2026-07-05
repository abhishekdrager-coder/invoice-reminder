import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { handleRouteError } from "@/lib/errors/http";
import { logAppError } from "@/lib/logger";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

function mapPriceIdToPlan(priceId: string | null | undefined) {
  if (priceId === env.NEXT_PUBLIC_STRIPE_PREMIUM_PRO_PRICE_ID) return "premium_pro";
  if (priceId === env.NEXT_PUBLIC_STRIPE_PREMIUM_LITE_PRICE_ID) return "premium_lite";
  return "free";
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = (await headers()).get("stripe-signature");

    if (!signature) {
      await logAppError({ level: "warn", context: "stripe.webhook", message: "Missing stripe signature" });
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      await logAppError({ level: "warn", context: "stripe.webhook", message: "Invalid stripe signature" });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const profileId = session.metadata?.profile_id;
      const plan = session.metadata?.plan === "premium_pro" ? "premium_pro" : session.metadata?.plan === "premium_lite" ? "premium_lite" : "free";

      if (profileId) {
        const { error } = await supabaseAdmin.from("subscriptions").upsert({
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

      const { error } = await supabaseAdmin
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

    return NextResponse.json({ received: true });
  } catch (error) {
    return handleRouteError(error, "stripe.webhook");
  }
}
