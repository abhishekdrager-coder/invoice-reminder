import { describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/authorization", () => ({
  requireUserApiContext: vi.fn(async () => ({ userId: "u1", email: "u1@example.com", role: "user", suspended: false })),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ url: "https://stripe.test/session" })),
      },
    },
  },
}));

describe("checkout security", () => {
  it("rejects forged client plan values", async () => {
    const { POST } = await import("@/app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "premium_pro<script>");

    const response = await POST(new Request("http://localhost/api/stripe/checkout", {
      method: "POST",
      body: form,
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
    }));

    expect(response.status).toBe(400);
  });
});
