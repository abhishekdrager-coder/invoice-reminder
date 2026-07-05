import { createClient } from "@supabase/supabase-js";
import { requireCoreEnv, requireServiceRoleEnv } from "@/lib/env";

export function getSupabaseAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = requireCoreEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = requireServiceRoleEnv();
  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, property) {
    const client = getSupabaseAdminClient();
    const value = Reflect.get(client as object, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
