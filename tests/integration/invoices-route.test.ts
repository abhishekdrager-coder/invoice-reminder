import { describe, expect, it, vi, beforeEach } from "vitest";

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
  requireUserContext: vi.fn(async () => ({ userId: "u1", role: "user", email: "u@test.com", suspended: false })),
  requireUserApiContext: vi.fn(async () => ({ userId: "u1", role: "user", email: "u@test.com", suspended: false })),
}));

vi.mock("@/lib/quota", () => ({
  checkInvoiceLimit: vi.fn(async () => ({ allowed: true, current: 0, limit: 5, plan: "free" })),
  buildUpgradeHint: vi.fn(() => ({ cta: "/settings/billing", recommendedPlan: "premium_lite" })),
}));

const fromMock = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({ from: fromMock })),
}));

describe("invoice CRUD route integration", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("GET returns invoice list for user", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(async () => ({ data: [{ id: "inv-1" }] })),
    };

    fromMock.mockReturnValue(query);

    const { GET } = await import("@/app/api/invoices/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.invoices).toHaveLength(1);
  });

  it("PATCH rejects invalid payload", async () => {
    const { PATCH } = await import("@/app/api/invoices/route");
    const response = await PATCH(
      new Request("http://localhost/api/invoices", {
        method: "PATCH",
        body: JSON.stringify({ invoiceId: "not-a-uuid", status: "bad" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("blocks invoice creation at free plan limit with upgrade hint", async () => {
    const quota = await import("@/lib/quota");
    vi.mocked(quota.checkInvoiceLimit).mockResolvedValueOnce({
      allowed: false,
      current: 5,
      limit: 5,
      plan: "free",
    });

    const { POST } = await import("@/app/api/invoices/route");
    const response = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          clientName: "Acme",
          clientEmail: "billing@acme.com",
          amount: 120,
          dueDate: "2026-08-01",
          invoiceNumber: "INV-01",
          notes: "-",
        }),
      }),
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.code).toBe("plan_limit_reached");
    expect(payload.details.cta).toBe("/settings/billing");
  });
});
