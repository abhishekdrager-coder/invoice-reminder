import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OWNER_ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
});

async function run() {
  const env = schema.parse(process.env);
  const email = env.OWNER_ADMIN_EMAIL ?? env.ADMIN_BOOTSTRAP_EMAIL;

  if (!email) {
    throw new Error("OWNER_ADMIN_EMAIL (or ADMIN_BOOTSTRAP_EMAIL) is required");
  }

  const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id,email,role")
    .eq("email", email)
    .maybeSingle();

  if (!profile?.id) {
    throw new Error(`No profile found for ${email}`);
  }

  await supabaseAdmin
    .from("profiles")
    .update({ role: "owner", is_suspended: false, suspended: false })
    .eq("id", profile.id);

  console.log(`Promoted ${email} to owner`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
