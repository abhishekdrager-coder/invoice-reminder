import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  authJson,
  getClientIp,
  getMissingCoreEnv,
  getMissingCoreEnvMessage,
  loginSchema,
  mapAuthError,
  validateRateLimit,
  zodFieldErrors,
} from "@/lib/auth";

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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return authJson(400, {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const allowed = validateRateLimit(`login:${getClientIp(request)}:${parsed.data.email.toLowerCase()}`, 8, 10 * 60 * 1000);
  if (!allowed) {
    return authJson(429, { success: false, message: "Too many login attempts. Please try again later." });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      const mapped = mapAuthError("login", error.message);
      return authJson(mapped.status, { success: false, message: mapped.message });
    }

    return authJson(200, { success: true, message: "Welcome back.", redirectTo: "/dashboard" });
  } catch {
    return authJson(500, { success: false, message: "Something went wrong. Please try again." });
  }
}
