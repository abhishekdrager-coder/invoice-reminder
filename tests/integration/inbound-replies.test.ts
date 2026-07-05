import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
process.env.STRIPE_SECRET_KEY = "sk";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.NEXT_PUBLIC_STRIPE_PREMIUM_LITE_PRICE_ID = "price_lite";
process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRO_PRICE_ID = "price_pro";
process.env.RESEND_API_KEY = "re";
process.env.EMAIL_FROM = "Invoice Copilot <noreply@example.com>";
process.env.OPENAI_API_KEY = "oa";
process.env.CRON_SECRET = "cron-secret";
process.env.INBOUND_SECRET = "inbound-secret";
process.env.SHOW_ADS = "true";

const fromMock = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}));

describe("inbound replies integration", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("marks invoice paid and skips pending reminders on paid intent", async () => {
    const updateSpy = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(async () => ({})) })) }));

    fromMock.mockImplementation((table: string) => {
      if (table === "invoices") {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: "inv_1" } })) })) })),
          update: vi.fn(() => ({ eq: vi.fn(async () => ({})) })),
        };
      }

      if (table === "inbound_replies") {
        return { insert: vi.fn(async () => ({})) };
      }

      if (table === "reminders") {
        return { update: updateSpy };
      }

      return { update: vi.fn(() => ({ eq: vi.fn(async () => ({})) })) };
    });

    const { POST } = await import("@/app/api/inbound/replies/route");
    const response = await POST(new Request("http://localhost/api/inbound/replies", {
      method: "POST",
      headers: {
        authorization: "Bearer inbound-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        invoiceId: "9f7fc080-5a89-4672-9d67-8ed3fed157f2",
        fromEmail: "payer@example.com",
        text: "paid this morning, thanks",
      }),
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.intent).toBe("paid");
    expect(updateSpy).toHaveBeenCalled();
  });
});