import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { env } from "@/lib/env";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 8 * 1024);
    assertSameOrigin(request);

    const user = await requireUserApiContext();

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("profile_id", user.userId)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      throw new AppError("No Stripe customer found", 404, "stripe_customer_missing");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    return handleRouteError(error, "stripe.portal");
  }
}
