import { env } from "../src/lib/env";
import { supabaseAdmin } from "../src/lib/supabase-admin";

async function run() {
  const email = env.ADMIN_BOOTSTRAP_EMAIL;
  if (!email) {
    throw new Error("ADMIN_BOOTSTRAP_EMAIL is required");
  }

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
    .update({ role: "admin", suspended: false })
    .eq("id", profile.id);

  console.log(`Promoted ${email} to admin`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
