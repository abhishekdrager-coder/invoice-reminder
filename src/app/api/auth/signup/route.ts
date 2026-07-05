import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  authJson,
  getClientIp,
  getMissingCoreEnv,
  getMissingCoreEnvMessage,
  mapAuthError,
  signupSchema,
  validateRateLimit,
  zodFieldErrors,
} from "@/lib/auth";
import { withBaseUrl } from "@/lib/utils";

export async function POST(request: Request) {
  const missingCoreEnv = getMissingCoreEnv();
  if (missingCoreEnv.length > 0) {
    return authJson(503, {
      success: false,
      message: process.env.NODE_ENV === "development"
        ? getMissingCoreEnvMessage() ?? `Core environment variables missing: ${missingCoreEnv.join(", ")}`
        : "Authentication is temporarily unavailable.",
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return authJson(400, { success: false, message: "Invalid request payload." });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return authJson(400, {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const allowed = validateRateLimit(`signup:${getClientIp(request)}:${parsed.data.email.toLowerCase()}`, 5, 10 * 60 * 1000);
  if (!allowed) {
    return authJson(429, { success: false, message: "Too many signup attempts. Please try again later." });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: withBaseUrl("/dashboard"),
      },
    });

    if (error) {
      const mapped = mapAuthError("signup", error.message);
      return authJson(mapped.status, { success: false, message: mapped.message });
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        user_id: data.user.id,
        full_name: parsed.data.fullName,
        email: parsed.data.email,
      }, { onConflict: "user_id" });
    }

    return authJson(200, {
      success: true,
      message: data.session ? "Account created successfully." : "Account created. Check your email to confirm your account.",
      redirectTo: data.session ? "/dashboard" : undefined,
    });
  } catch {
    return authJson(500, { success: false, message: "Something went wrong. Please try again." });
  }
}
