import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { withBaseUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: subscription } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.redirect(withBaseUrl("/settings/billing"));
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: withBaseUrl("/settings/billing"),
  });

  return NextResponse.redirect(session.url);
}
