import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { handleRouteError } from "@/lib/errors/http";
import { assertAllowlistedEmail } from "@/lib/allowlist";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { signupSchema } from "@/lib/validation";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { requireCoreEnv } from "@/lib/env";

function wantsJson(request: Request) {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function signupFailureResponse(request: Request, message: string, status = 400) {
  if (wantsJson(request)) {
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const url = new URL(request.url);
  url.pathname = "/signup";
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 8 * 1024);
    assertSameOrigin(request);

    const formData = await request.formData();
    const parsed = signupSchema.safeParse({
      fullName: sanitizeText(formData.get("fullName")),
      email: sanitizeEmail(formData.get("email")),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return signupFailureResponse(request, "Please provide valid signup details.", 400);
    }

    try {
      assertAllowlistedEmail(parsed.data.email);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Access blocked";
      return signupFailureResponse(request, message, 403);
    }

    const ip = getClientIp(request);
    const gate = checkRateLimit(`auth:signup:${ip}:${parsed.data.email}`, 5, 10 * 60_000);
    if (!gate.allowed) {
      return signupFailureResponse(request, "Too many signup attempts. Please try again later.", 429);
    }

    const { NEXT_PUBLIC_APP_URL } = requireCoreEnv();
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: { full_name: parsed.data.fullName },
      },
    });

    if (error) {
      return signupFailureResponse(request, error.message, 400);
    }

    if (wantsJson(request)) {
      return NextResponse.json({ ok: true, success: "Check your email to confirm your account." });
    }

    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = "/signup";
    redirectUrl.searchParams.set("success", "Check your email to confirm your account");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    return handleRouteError(error, "auth.signup");
  }
}
