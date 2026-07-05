import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
process.env.STRIPE_SECRET_KEY = "sk";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.STRIPE_PREMIUM_LITE_PRICE_ID = "price_lite";
process.env.STRIPE_PREMIUM_PRO_PRICE_ID = "price_pro";
process.env.RESEND_API_KEY = "re";
process.env.EMAIL_FROM = "Invoice Copilot <noreply@example.com>";
process.env.OPENAI_API_KEY = "oa";
process.env.CRON_SECRET = "cron-secret";
process.env.INBOUND_SECRET = "inbound-secret";
process.env.SHOW_ADS = "true";

let originalAllowlistMode: string | undefined;
let originalAllowlistEmails: string | undefined;

beforeEach(() => {
  originalAllowlistMode = process.env.ALLOWLIST_MODE;
  originalAllowlistEmails = process.env.ALLOWLIST_EMAILS;
  process.env.ALLOWLIST_MODE = "true";
  process.env.ALLOWLIST_EMAILS = "allowed@example.com";
  vi.resetModules();
});

afterEach(() => {
  process.env.ALLOWLIST_MODE = originalAllowlistMode;
  process.env.ALLOWLIST_EMAILS = originalAllowlistEmails;
  vi.resetModules();
});

describe("allowlist mode", () => {
  it("blocks non-allowlisted email", async () => {
    const mod = await import("@/lib/allowlist");
    expect(() => mod.assertAllowlistedEmail("blocked@example.com")).toThrow();
  });

  it("permits allowlisted email", async () => {
    const mod = await import("@/lib/allowlist");
    expect(() => mod.assertAllowlistedEmail("allowed@example.com")).not.toThrow();
  });
});
