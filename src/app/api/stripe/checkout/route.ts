import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripePriceId, stripe } from "@/lib/stripe";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { withBaseUrl } from "@/lib/utils";

const schema = z.object({
  plan: z.enum(["free", "starter", "pro"]),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = schema.safeParse({ plan: formData.get("plan") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  if (parsed.data.plan === "free") {
    return NextResponse.redirect(withBaseUrl("/settings/billing"));
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: subscription } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  const priceId = getStripePriceId(parsed.data.plan);

  if (!priceId) {
    return NextResponse.json({ error: "Stripe price not configured." }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: withBaseUrl("/settings/billing?checkout=success"),
    cancel_url: withBaseUrl("/settings/billing?checkout=cancelled"),
    customer: subscription?.stripe_customer_id ?? undefined,
    customer_email: subscription?.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
  });

  return NextResponse.redirect(session.url ?? withBaseUrl("/settings/billing"));
}
