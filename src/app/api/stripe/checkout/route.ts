import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { env } from "@/lib/env";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAppError } from "@/lib/logger";
import { requireStripeEnv } from "@/lib/env";
import { assertSameOrigin, enforceRequestSize, getClientIp } from "@/lib/request-security";
import { getStripeClient } from "@/lib/stripe";
import { stripeCheckoutSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 16 * 1024);
    assertSameOrigin(request);

    const formData = await request.formData();
    const parsed = stripeCheckoutSchema.safeParse({
      plan: String(formData.get("plan") ?? "premium_lite"),
    });
    if (!parsed.success) {
      throw new AppError("Unsupported plan", 400, "unsupported_plan");
    }
    const plan = parsed.data.plan;

    const user = await requireUserApiContext();
    const ip = getClientIp(request);
    const gate = checkRateLimit(`checkout:${user.userId}:${ip}`, 8, 60_000);
    if (!gate.allowed) {
      await logAppError({
        level: "warn",
        context: "stripe.checkout",
        message: "Checkout rate limit exceeded",
        profileId: user.userId,
        metadata: { ip },
      });
      throw new AppError("Rate limit exceeded", 429, "rate_limit");
    }

    if (env.BILLING_CHALLENGE_ENABLED === "true") {
      const challengeGate = checkRateLimit(`checkout-challenge:${user.userId}:${ip}`, env.BILLING_CHALLENGE_THRESHOLD, 10 * 60_000);
      if (!challengeGate.allowed) {
        const challenge = String(formData.get("challenge") ?? "");
        if (!env.BILLING_CHALLENGE_TOKEN || challenge !== env.BILLING_CHALLENGE_TOKEN) {
          await logAppError({
            level: "warn",
            context: "stripe.checkout",
            message: "Billing challenge failed",
            profileId: user.userId,
            metadata: { ip },
          });
          throw new AppError("Billing challenge required", 429, "billing_challenge_required");
        }
      }
    }

    const stripe = getStripeClient();
    const { STRIPE_PREMIUM_LITE_PRICE_ID, STRIPE_PREMIUM_PRO_PRICE_ID } = requireStripeEnv();
    const priceId =
      plan === "premium_pro"
        ? STRIPE_PREMIUM_PRO_PRICE_ID
        : STRIPE_PREMIUM_LITE_PRICE_ID;

    const idempotencyKey = request.headers.get("x-idempotency-key")
      ?? `checkout:${user.userId}:${plan}:${Math.floor(Date.now() / 30_000)}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      customer_email: user.email,
      metadata: { profile_id: user.userId, user_id: user.userId, plan },
    }, { idempotencyKey });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (error) {
    return handleRouteError(error, "stripe.checkout");
  }
}
