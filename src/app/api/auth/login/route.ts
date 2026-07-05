import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { handleRouteError } from "@/lib/errors/http";
import { assertAllowlistedEmail } from "@/lib/allowlist";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { loginSchema } from "@/lib/validation";
import { sanitizeEmail } from "@/lib/sanitize";

function wantsJson(request: Request) {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function authFailureResponse(request: Request, message: string, status = 400) {
  if (wantsJson(request)) {
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const url = new URL(request.url);
  url.pathname = "/login";
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 8 * 1024);
    assertSameOrigin(request);

    const formData = await request.formData();
    const parsed = loginSchema.safeParse({
      email: sanitizeEmail(formData.get("email")),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return authFailureResponse(request, "Please provide a valid email and password.", 400);
    }

    try {
      assertAllowlistedEmail(parsed.data.email);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Access blocked";
      return authFailureResponse(request, message, 403);
    }

    const ip = getClientIp(request);
    const gate = checkRateLimit(`auth:login:${ip}:${parsed.data.email}`, 8, 10 * 60_000);
    if (!gate.allowed) {
      return authFailureResponse(request, "Too many login attempts. Please try again later.", 429);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return authFailureResponse(request, error.message, 401);
    }

    if (wantsJson(request)) {
      return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
    }

    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    return handleRouteError(error, "auth.login");
  }
}
