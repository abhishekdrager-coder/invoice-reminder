import { beforeEach, describe, expect, it, vi } from "vitest";

(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signInWithOAuth = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword,
      signUp,
      signInWithOAuth,
    },
  })),
}));

describe("auth route handlers", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    signUp.mockReset();
    signInWithOAuth.mockReset();
    process.env.ALLOWLIST_MODE = "false";
    delete process.env.ALLOWLIST_EMAILS;
  });

  it("login route succeeds with only core env vars and optional integrations absent", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.CRON_SECRET;

    signInWithPassword.mockResolvedValueOnce({ error: null });

    const { POST } = await import("@/app/api/auth/login/route");
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "supersecret123");

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: formData,
        headers: { accept: "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.redirectTo).toBe("/dashboard");
  });

  it("signup route returns friendly validation error", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const formData = new FormData();
    formData.set("fullName", "A");
    formData.set("email", "bad-email");
    formData.set("password", "123");

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: formData,
        headers: { accept: "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("valid signup details");
  });

  it("google route returns redirect when oauth starts", async () => {
    signInWithOAuth.mockResolvedValueOnce({
      data: { url: "https://accounts.google.com/o/oauth2/auth" },
      error: null,
    });

    const { POST } = await import("@/app/api/auth/google/route");
    const response = await POST(
      new Request("http://localhost/api/auth/google", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("accounts.google.com");
  });
});
