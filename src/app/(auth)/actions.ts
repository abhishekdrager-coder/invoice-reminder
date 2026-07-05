"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { withBaseUrl } from "@/lib/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

const authSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  fullName: z.string().min(2, "Enter your full name.").optional(),
});

export async function signIn(input: { email: string; password: string }): Promise<ActionResult> {
  const parsed = authSchema.omit({ fullName: true }).safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid credentials." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Welcome back.", redirectTo: "/dashboard" };
}

export async function signUp(input: { email: string; password: string; fullName: string }): Promise<ActionResult> {
  const parsed = authSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid signup data." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      emailRedirectTo: withBaseUrl("/dashboard"),
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  if (data.user) {
    await supabase.from("profiles").upsert({
      user_id: data.user.id,
      full_name: parsed.data.fullName ?? null,
      email: parsed.data.email,
    }, { onConflict: "user_id" });
  }

  return {
    success: true,
    message: data.session ? "Account created successfully." : "Account created. Check your email to confirm your account.",
    redirectTo: data.session ? "/dashboard" : undefined,
  };
}

export async function signInWithGoogle(): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: withBaseUrl("/auth/callback"),
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Redirecting to Google...", redirectTo: data.url };
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
