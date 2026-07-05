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

const upsertMock = vi.fn(async () => ({ error: null }));
const updateMock = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
const insertWebhookEventMock = vi.fn(async (): Promise<{ error: { code: string; message: string } | null }> => ({ error: null }));
const constructEventMock = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "stripe_webhook_events") {
        return { insert: insertWebhookEventMock };
      }

      return {
        upsert: upsertMock,
        update: updateMock,
      };
    }),
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map([["stripe-signature", "sig"]])),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
  },
}));

describe("stripe webhook integration", () => {
  beforeEach(() => {
    upsertMock.mockClear();
    updateMock.mockClear();
    insertWebhookEventMock.mockClear();
    constructEventMock.mockClear();
  });

  it("rejects invalid signature", async () => {
    constructEventMock.mockImplementationOnce(() => {
      throw new Error("bad signature");
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const response = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));

    expect(response.status).toBe(400);
  });

  it("updates subscription state on checkout completion", async () => {
    constructEventMock.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { profile_id: "u1", plan: "premium_lite" },
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const response = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));

    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalled();
  });

  it("ignores replayed webhook events", async () => {
    insertWebhookEventMock.mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } });
    constructEventMock.mockReturnValueOnce({
      id: "evt_dup",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { profile_id: "u1", plan: "premium_lite" },
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const response = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));

    expect(response.status).toBe(200);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("syncs updates on subscription status changes", async () => {
    constructEventMock.mockReturnValueOnce({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "canceled",
          current_period_end: 1780000000,
        },
      },
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const response = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });
});
