import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { AppError } from "@/lib/errors/http";

export type UserContext = {
  userId: string;
  email: string;
  role: "user" | "admin";
  suspended: boolean;
};

export async function requireUserContext(): Promise<UserContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,suspended,email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new AppError("Profile not found", 403, "profile_not_found");
  }

  if (profile.suspended) {
    throw new AppError("Account suspended", 403, "account_suspended");
  }

  await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);

  return {
    userId: user.id,
    email: profile.email,
    role: profile.role,
    suspended: profile.suspended,
  };
}

export async function requireAdminContext() {
  const context = await requireUserContext();
  if (context.role !== "admin") {
    redirect("/dashboard");
  }
  return context;
}

export async function requireAdminApiContext() {
  const context = await requireUserContext();
  if (context.role !== "admin") {
    throw new AppError("Forbidden", 403, "forbidden");
  }
  return context;
}

export async function requireUserApiContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError("Unauthorized", 401, "unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,suspended,email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new AppError("Profile not found", 403, "profile_not_found");
  }

  if (profile.suspended) {
    throw new AppError("Account suspended", 403, "account_suspended");
  }

  await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);

  return {
    userId: user.id,
    email: profile.email,
    role: profile.role,
    suspended: profile.suspended,
  } as UserContext;
}
