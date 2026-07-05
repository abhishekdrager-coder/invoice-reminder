import { beforeEach, describe, expect, it, vi } from "vitest";

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

const constructEventMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
  },
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  },
}));

describe("stripe webhook security helpers", () => {
  beforeEach(() => {
    constructEventMock.mockReset();
    insertMock.mockReset();
  });

  it("verifies valid signature payload", async () => {
    constructEventMock.mockReturnValueOnce({ id: "evt_1" });
    const mod = await import("@/lib/stripe-webhook-security");
    const event = mod.verifyStripeWebhookEvent("{}", "sig");
    expect(event.id).toBe("evt_1");
  });

  it("rejects replayed events", async () => {
    insertMock.mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } });
    const mod = await import("@/lib/stripe-webhook-security");
    const firstSeen = await mod.reserveWebhookEventId("evt_replay");
    expect(firstSeen).toBe(false);
  });
});
