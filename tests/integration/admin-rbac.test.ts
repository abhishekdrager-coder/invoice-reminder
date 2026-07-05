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
  requireAdminApiContext: vi.fn(async () => {
    throw new Error("forbidden");
  }),
}));

describe("admin RBAC", () => {
  it("non-admin is blocked from admin mutation endpoint", async () => {
    const { POST } = await import("@/app/api/admin/users/route");
    const formData = new FormData();
    formData.set("profileId", "9f7fc080-5a89-4672-9d67-8ed3fed157f2");
    formData.set("suspended", "true");

    const response = await POST(new Request("http://localhost/api/admin/users", {
      method: "POST",
      body: formData,
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
    }));

    expect(response.status).toBe(500);
  });
});
