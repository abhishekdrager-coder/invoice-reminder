export const DEMO_SESSION_COOKIE = "demo_session";

export type DemoUser = { id: string; email: string; fullName: string };

const placeholderUrls = ["", "https://your-project-ref.supabase.co", "https://placeholder.supabase.co"];
const placeholderKeys = ["", "your-supabase-anon-key", "placeholder-anon-key"];

export function isSupabasePlaceholderEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return placeholderUrls.includes(url) || placeholderKeys.includes(key);
}

export function isDemoAuthEnabled() {
  return isSupabasePlaceholderEnv() && process.env.NODE_ENV !== "production";
}

export function encodeDemoSession(user: { email: string; fullName?: string }) {
  const payload = {
    email: user.email,
    fullName: user.fullName?.trim() || user.email.split("@")[0],
  };
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeDemoSession(value: string | undefined | null): DemoUser | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as { email?: string; fullName?: string };
    if (!parsed.email) return null;
    return { id: "demo-user", email: parsed.email, fullName: parsed.fullName ?? "Demo user" };
  } catch {
    return null;
  }
}

export function demoSessionSetCookie(value: string) {
  return `${DEMO_SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

export function demoSessionClearCookie() {
  return `${DEMO_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
