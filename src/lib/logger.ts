import { supabaseAdmin } from "@/lib/supabase-admin";

type LogLevel = "info" | "warn" | "error";

export async function logAppError(input: {
  level: LogLevel;
  context: string;
  message: string;
  profileId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabaseAdmin.from("app_logs").insert({
      level: input.level,
      context: input.context,
      message: input.message,
      profile_id: input.profileId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    console.error("[app-log-fallback]", input);
  }
}
