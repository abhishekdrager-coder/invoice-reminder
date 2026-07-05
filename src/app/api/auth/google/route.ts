import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authJson, getMissingCoreEnv, mapAuthError } from "@/lib/auth";
import { withBaseUrl } from "@/lib/utils";

export async function POST() {
  const missingCoreEnv = getMissingCoreEnv();
  if (missingCoreEnv.length > 0) {
    return authJson(503, {
      success: false,
      message: process.env.NODE_ENV === "development"
        ? `Core environment variables missing: ${missingCoreEnv.join(", ")}`
        : "Authentication is temporarily unavailable.",
    });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: withBaseUrl("/auth/callback"),
      },
    });

    if (error || !data.url) {
      const mapped = mapAuthError("google", error?.message);
      return authJson(mapped.status, { success: false, message: mapped.message });
    }

    return authJson(200, { success: true, message: "Redirecting to Google...", redirectTo: data.url });
  } catch {
    return authJson(500, { success: false, message: "Something went wrong. Please try again." });
  }
}
