import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signInWithOAuth = vi.fn();
const profileUpsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      signInWithPassword,
      signUp,
      signInWithOAuth,
    },
    from: vi.fn(() => ({
      upsert: profileUpsert,
    })),
  })),
}));

describe("auth routes", () => {
  beforeEach(() => {
    vi.resetModules();
    signInWithPassword.mockReset();
    signUp.mockReset();
    signInWithOAuth.mockReset();
    profileUpsert.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    delete process.env.OPENAI_API_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.CRON_SECRET;
  });

  it("/api/auth/login returns 401 json for invalid credentials", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: "Invalid email or password.",
    });
  });

  it("/api/auth/signup returns 409 json for duplicate account", async () => {
    signUp.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: "User already registered" } });
    const { POST } = await import("@/app/api/auth/signup/route");

    const response = await POST(new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ fullName: "Test User", email: "user@example.com", password: "password123" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: "An account with this email already exists.",
    });
  });

  it("missing optional env does not affect auth endpoints", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(401);
  });
});
