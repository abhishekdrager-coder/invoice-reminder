import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { DEMO_SESSION_COOKIE, decodeDemoSession, isSupabasePlaceholderEnv } from "@/lib/demo-session";
import type { Database } from "@/types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (isSupabasePlaceholderEnv()) {
    const demo = decodeDemoSession(request.cookies.get(DEMO_SESSION_COOKIE)?.value ?? null);
    const user = demo ? ({ id: demo.id, email: demo.email } as unknown as User) : null;
    return { response, user };
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
