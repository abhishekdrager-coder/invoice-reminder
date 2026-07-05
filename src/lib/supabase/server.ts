import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { DEMO_SESSION_COOKIE, isSupabasePlaceholderEnv } from "@/lib/demo-session";
import { createDemoSupabaseClient } from "@/lib/supabase/demo-client";
import type { Database } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-service-role-key";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  if (isSupabasePlaceholderEnv()) {
    return createDemoSupabaseClient({
      getSessionCookie: () => cookieStore.get(DEMO_SESSION_COOKIE)?.value,
      clearSessionCookie: () => {
        cookieStore.delete(DEMO_SESSION_COOKIE);
      },
    }) as unknown as ReturnType<typeof createServerClient<Database>>;
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export function createAdminClient() {
  if (isSupabasePlaceholderEnv()) {
    return createDemoSupabaseClient({
      getSessionCookie: () => undefined,
      clearSessionCookie: () => {},
    }) as unknown as ReturnType<typeof createSupabaseClient<Database>>;
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
