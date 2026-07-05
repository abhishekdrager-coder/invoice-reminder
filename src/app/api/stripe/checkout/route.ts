import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { env } from "@/lib/env";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { stripe } from "@/lib/stripe";
import { stripeCheckoutSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const parsed = stripeCheckoutSchema.safeParse({
      plan: String(formData.get("plan") ?? "premium_lite"),
    });
    if (!parsed.success) {
      throw new AppError("Unsupported plan", 400, "unsupported_plan");
    }
    const plan = parsed.data.plan;

    const user = await requireUserApiContext();
    const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const gate = checkRateLimit(`checkout:${user.userId}:${ip}`, 8, 60_000);
    if (!gate.allowed) {
      throw new AppError("Rate limit exceeded", 429, "rate_limit");
    }

    const priceId =
      plan === "premium_pro"
        ? env.NEXT_PUBLIC_STRIPE_PREMIUM_PRO_PRICE_ID
        : env.NEXT_PUBLIC_STRIPE_PREMIUM_LITE_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      customer_email: user.email,
      metadata: { profile_id: user.userId, user_id: user.userId, plan },
    });

    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (error) {
    return handleRouteError(error, "stripe.checkout");
  }
}
