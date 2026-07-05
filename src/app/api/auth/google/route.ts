import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { handleRouteError } from "@/lib/errors/http";
import { isAllowlistModeEnabled } from "@/lib/allowlist";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { requireCoreEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 4 * 1024);
    assertSameOrigin(request);

    if (isAllowlistModeEnabled()) {
      const errorUrl = new URL(request.url);
      errorUrl.pathname = "/login";
      errorUrl.searchParams.set("error", "Google sign-in disabled in private beta mode");
      return NextResponse.redirect(errorUrl, { status: 303 });
    }

    const { NEXT_PUBLIC_APP_URL } = requireCoreEnv();
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${NEXT_PUBLIC_APP_URL}/auth/callback` },
    });

    if (error || !data.url) {
      const errorUrl = new URL(request.url);
      errorUrl.pathname = "/login";
      errorUrl.searchParams.set("error", "Could not start Google login");
      return NextResponse.redirect(errorUrl, { status: 303 });
    }

    return NextResponse.redirect(data.url, { status: 303 });
  } catch (error) {
    return handleRouteError(error, "auth.google");
  }
}
