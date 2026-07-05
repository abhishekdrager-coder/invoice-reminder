import { beforeEach, describe, expect, it, vi } from "vitest";

describe("demo auth mode", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://your-project-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "your-supabase-anon-key";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("login issues a local demo session when Supabase is not configured", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "demo@example.com", password: "password123" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("demo_session=");
    await expect(response.json()).resolves.toMatchObject({ success: true, redirectTo: "/dashboard" });
  });

  it("signup issues a local demo session when Supabase is not configured", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const response = await POST(new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ fullName: "Demo User", email: "demo@example.com", password: "password123" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("demo_session=");
    await expect(response.json()).resolves.toMatchObject({ success: true, redirectTo: "/dashboard" });
  });

  it("still validates input in demo mode", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "bad", password: "1" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(400);
  });
});
