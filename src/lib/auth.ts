import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type AuthFieldErrors = Partial<Record<"email" | "password" | "fullName", string>>;

export type AuthResponse = {
  success: boolean;
  message: string;
  fieldErrors?: AuthFieldErrors;
  redirectTo?: string;
};

const authBuckets = new Map<string, number[]>();

function isPlaceholderValue(value: string | undefined) {
  if (!value) return true;
  return [
    "https://your-project-ref.supabase.co",
    "your-supabase-anon-key",
    "https://placeholder.supabase.co",
    "placeholder-anon-key",
  ].includes(value);
}

export function getMissingCoreEnv(): string[] {
  const missing: string[] = [];
  if (isPlaceholderValue(process.env.NEXT_PUBLIC_SUPABASE_URL)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (isPlaceholderValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return missing;
}

export function getMissingCoreEnvMessage() {
  const missing = getMissingCoreEnv();
  if (missing.length === 0) {
    return null;
  }

  return `Supabase is not configured. Replace the placeholder values for ${missing.join(" and ")} in .env.local.`;
}

export function hasCoreEnv() {
  return getMissingCoreEnv().length === 0;
}

export function validateRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (authBuckets.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= max) {
    return false;
  }

  recent.push(now);
  authBuckets.set(key, recent);
  return true;
}

export function zodFieldErrors(error: z.ZodError): AuthFieldErrors {
  const fieldErrors: AuthFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in fieldErrors)) {
      fieldErrors[field as keyof AuthFieldErrors] = issue.message;
    }
  }

  return fieldErrors;
}

export function mapAuthError(kind: "login" | "signup" | "google", message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();

  if (kind === "login") {
    if (normalized.includes("invalid login credentials") || normalized.includes("invalid_credentials")) {
      return { status: 401, message: "Invalid email or password." };
    }

    if (normalized.includes("email not confirmed")) {
      return { status: 401, message: "Please verify your email before logging in." };
    }
  }

  if (kind === "signup") {
    if (normalized.includes("already registered") || normalized.includes("user already registered") || normalized.includes("already been registered")) {
      return { status: 409, message: "An account with this email already exists." };
    }
  }

  if (kind === "google") {
    return { status: 500, message: "Unable to start Google sign-in. Please try again." };
  }

  return { status: 500, message: "Something went wrong. Please try again." };
}

export function authJson(status: number, body: AuthResponse) {
  return Response.json(body, { status });
}

export function getClientIp(request: Request) {
  return (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() || "unknown";
}