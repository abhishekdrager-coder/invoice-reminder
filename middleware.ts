import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowlistModeEnabled, isEmailAllowlisted } from "@/lib/allowlist";

function hasCoreEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=() ");
  return response;
}

export async function middleware(request: NextRequest) {
  const isSetupPath = request.nextUrl.pathname === "/setup";
  if (!hasCoreEnv()) {
    if (process.env.NODE_ENV === "development" && !isSetupPath) {
      const setupUrl = request.nextUrl.clone();
      setupUrl.pathname = "/setup";
      return applySecurityHeaders(NextResponse.redirect(setupUrl));
    }

    if (process.env.NODE_ENV === "production") {
      return applySecurityHeaders(
        new NextResponse("Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY", {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
      );
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appPath = request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/invoices") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/admin");

  if (appPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  if (user && appPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,is_suspended,suspended,email")
      .eq("id", user.id)
      .single();

    if (profile?.is_suspended ?? profile?.suspended) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "Account suspended");
      return applySecurityHeaders(NextResponse.redirect(url));
    }

    if (isAllowlistModeEnabled() && !isEmailAllowlisted(profile?.email ?? user.email ?? null)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "Access restricted in private beta mode");
      return applySecurityHeaders(NextResponse.redirect(url));
    }

    if (request.nextUrl.pathname.startsWith("/admin/security") && profile?.role !== "owner") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/overview";
      return applySecurityHeaders(NextResponse.redirect(url));
    }

    const role = (profile?.role ?? "user") as "user" | "admin" | "owner";
    if (request.nextUrl.pathname.startsWith("/admin") && role !== "admin" && role !== "owner") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return applySecurityHeaders(NextResponse.redirect(url));
    }
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/", "/login", "/signup", "/auth/:path*", "/setup", "/dashboard/:path*", "/invoices/:path*", "/settings/:path*", "/admin/:path*", "/i/:path*"],
};
