import { NextResponse } from "next/server";
import { requireUserApiContext } from "@/lib/authorization";
import { handleRouteError, AppError } from "@/lib/errors/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { adEventSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 8 * 1024);
    assertSameOrigin(request);
    const user = await requireUserApiContext();
    const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const gate = checkRateLimit(`ads:${user.userId}:${ip}`, 60, 60_000);
    if (!gate.allowed) {
      throw new AppError("Rate limit exceeded", 429, "rate_limit");
    }

    const parsed = adEventSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid ad event payload", 400, "invalid_payload");
    }

    await supabaseAdmin.from("ad_events").insert({
      profile_id: user.userId,
      user_id: user.userId,
      placement: parsed.data.placement,
      event_type: parsed.data.eventType,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "ads.events.post");
  }
}
