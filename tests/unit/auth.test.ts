import { describe, expect, it } from "vitest";

import { getMissingCoreEnv, loginSchema, mapAuthError, signupSchema, zodFieldErrors } from "@/lib/auth";

describe("auth helpers", () => {
  it("validates login payloads", () => {
    const parsed = loginSchema.safeParse({ email: "bad-email", password: "123" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(zodFieldErrors(parsed.error)).toMatchObject({
        email: "Enter a valid email address.",
      });
    }
  });

  it("validates signup payloads", () => {
    const parsed = signupSchema.safeParse({ fullName: "A", email: "a@example.com", password: "12345678" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(zodFieldErrors(parsed.error)).toMatchObject({
        fullName: "Enter your full name.",
      });
    }
  });

  it("maps invalid login credentials to 401", () => {
    expect(mapAuthError("login", "Invalid login credentials")).toEqual({
      status: 401,
      message: "Invalid email or password.",
    });
  });

  it("maps duplicate signup to 409", () => {
    expect(mapAuthError("signup", "User already registered")).toEqual({
      status: 409,
      message: "An account with this email already exists.",
    });
  });

  it("reports missing core env names", () => {
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(getMissingCoreEnv()).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);

    process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon;
  });
});
