import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/components/auth/credentials-form", () => ({
  CredentialsForm: () => <div>CredentialsForm</div>,
}));

const requiredEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

describe("env and auth startup safety", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const key of [
      "SUPABASE_SERVICE_ROLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PREMIUM_LITE_PRICE_ID",
      "STRIPE_PREMIUM_PRO_PRICE_ID",
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "OPENAI_API_KEY",
      "CRON_SECRET",
      "CRON_ALLOWLIST_IPS",
      "BILLING_CHALLENGE_TOKEN",
    ]) {
      delete process.env[key];
    }

    Object.assign(process.env, requiredEnv);
  });

  it("keeps core env ready and reports missing optional integrations separately", async () => {
    const env = await import("@/lib/env");

    expect(env.isCoreEnvReady()).toBe(true);
    expect(env.getMissingCoreEnvNames()).toEqual([]);
    expect(() => env.requireStripeEnv()).toThrowError(/Stripe environment variables missing/);
    expect(() => env.requireEmailEnv()).toThrowError(/Email environment variables missing/);
    expect(() => env.requireAIEnv()).toThrowError(/AI environment variables missing/);
    expect(() => env.requireCronEnv()).toThrowError(/Cron environment variables missing/);
  });

  it("reports missing core env names without crashing on import", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.resetModules();

    const env = await import("@/lib/env");

    expect(env.isCoreEnvReady()).toBe(false);
    expect(env.getMissingCoreEnvNames()).toEqual(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  });

  it("renders the login page when only core env vars are present", async () => {
    const { default: LoginPage } = await import("@/app/(auth)/login/page");
    const html = renderToStaticMarkup(
      await LoginPage({ searchParams: Promise.resolve({}) } as { searchParams: Promise<{ error?: string }> }),
    );

    expect(html).toContain("Welcome back");
    expect(html).toContain("Log in to manage your reminders.");
  });
});