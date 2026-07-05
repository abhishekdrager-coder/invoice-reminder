import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { AppError } from "@/lib/errors/http";
import { isAllowlistModeEnabled, isEmailAllowlisted } from "@/lib/allowlist";
import { env } from "@/lib/env";
import { hasAdminAccess, hasOwnerAccess } from "@/lib/roles";

export type UserContext = {
  userId: string;
  email: string;
  role: "user" | "admin" | "owner";
  suspended: boolean;
};

function getSuspendedState(profile: { is_suspended?: boolean | null; suspended?: boolean | null }) {
  return Boolean(profile.is_suspended ?? profile.suspended);
}

function ensureVerifiedEmail(user: { email?: string | null; email_confirmed_at?: string | null }) {
  if (isAllowlistModeEnabled() && isEmailAllowlisted(user.email)) {
    return;
  }

  if (!user.email_confirmed_at) {
    throw new AppError("Email verification required", 403, "email_not_verified");
  }
}

async function syncOwnerRole(supabase: Awaited<ReturnType<typeof createClient>>, profile: {
  role: "user" | "admin" | "owner";
  email: string;
  is_suspended?: boolean | null;
  suspended?: boolean | null;
  id?: string;
}, userId: string) {
  if (!env.OWNER_ADMIN_EMAIL) return profile;
  if (profile.email.toLowerCase() !== env.OWNER_ADMIN_EMAIL.toLowerCase()) return profile;
  if (profile.role === "owner" && !getSuspendedState(profile)) return profile;

  await supabase
    .from("profiles")
    .update({ role: "owner", is_suspended: false, suspended: false })
    .eq("id", userId);

  return {
    ...profile,
    role: "owner" as const,
    is_suspended: false,
    suspended: false,
  };
}

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
    .select("role,is_suspended,suspended,email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new AppError("Profile not found", 403, "profile_not_found");
  }

  const normalizedProfile = await syncOwnerRole(supabase, profile, user.id);

  const suspended = getSuspendedState(normalizedProfile);
  if (suspended) {
    throw new AppError("Account suspended", 403, "account_suspended");
  }

  if (isAllowlistModeEnabled() && !isEmailAllowlisted(normalizedProfile.email)) {
    throw new AppError("Access restricted in private beta mode", 403, "allowlist_restricted");
  }

  ensureVerifiedEmail({ email: normalizedProfile.email, email_confirmed_at: user.email_confirmed_at });

  await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);

  return {
    userId: user.id,
    email: normalizedProfile.email,
    role: normalizedProfile.role,
    suspended,
  };
}

export async function requireAdminContext() {
  const context = await requireUserContext();
  if (!hasAdminAccess(context.role)) {
    redirect("/dashboard");
  }
  return context;
}

export async function requireOwnerContext() {
  const context = await requireUserContext();
  if (!hasOwnerAccess(context.role)) {
    redirect("/admin/overview");
  }
  return context;
}

export async function requireAdminApiContext() {
  const context = await requireUserContext();
  if (!hasAdminAccess(context.role)) {
    throw new AppError("Forbidden", 403, "forbidden");
  }
  return context;
}

export async function requireOwnerApiContext() {
  const context = await requireUserContext();
  if (!hasOwnerAccess(context.role)) {
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
    .select("role,is_suspended,suspended,email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new AppError("Profile not found", 403, "profile_not_found");
  }

  const normalizedProfile = await syncOwnerRole(supabase, profile, user.id);

  const suspended = getSuspendedState(normalizedProfile);
  if (suspended) {
    throw new AppError("Account suspended", 403, "account_suspended");
  }

  if (isAllowlistModeEnabled() && !isEmailAllowlisted(normalizedProfile.email)) {
    throw new AppError("Access restricted in private beta mode", 403, "allowlist_restricted");
  }

  ensureVerifiedEmail({ email: normalizedProfile.email, email_confirmed_at: user.email_confirmed_at });

  await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);

  return {
    userId: user.id,
    email: normalizedProfile.email,
    role: normalizedProfile.role,
    suspended,
  } as UserContext;
}
