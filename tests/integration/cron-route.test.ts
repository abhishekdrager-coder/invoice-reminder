import { describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/openai", () => ({
  openai: {
    responses: {
      create: vi.fn(async () => ({ output_text: "Reminder body" })),
    },
  },
}));

vi.mock("@/lib/resend", () => ({
  resend: {
    emails: {
      send: vi.fn(async () => ({ data: { id: "em_1" }, error: null })),
    },
  },
}));

describe("cron send-reminders integration", () => {
  it("rejects invalid cron token", async () => {
    const { POST } = await import("@/app/api/cron/send-reminders/route");
    const response = await POST(new Request("http://localhost/api/cron/send-reminders", { method: "POST" }));
    expect(response.status).toBe(401);
  });

  it("avoids duplicate sends by requiring claim transition", async () => {
    const pendingRows = [{ id: "r1", profile_id: "u1", idempotency_key: "r1:0", invoices: [{ amount_cents: 1000, due_date: "2026-07-10", status: "unpaid", clients: [{ name: "A", email: "a@example.com" }] }], profiles: [{ default_tone: "neutral" }] }];

    let claimAttempt = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === "reminders") {
        const selectChain = {
          eq: vi.fn(() => selectChain),
          lte: vi.fn(() => selectChain),
          limit: vi.fn(async () => ({ data: pendingRows })),
          gte: vi.fn(async () => ({ count: 0 })),
        };

        return {
          select: vi.fn(() => selectChain),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  select: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => {
                      claimAttempt += 1;
                      return claimAttempt === 1 ? { data: { id: "r1" }, error: null } : { data: null, error: null };
                    }),
                  })),
                })),
                eq: vi.fn(async () => ({ error: null })),
              })),
            })),
          })),
        };
      }

      if (table === "subscriptions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: { plan: "free" } })),
              })),
            })),
          })),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(async () => ({ count: 0 })),
            })),
          })),
        })),
      };
    });

    const { POST } = await import("@/app/api/cron/send-reminders/route");
    const response = await POST(
      new Request("http://localhost/api/cron/send-reminders", {
        method: "POST",
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.sent).toBe(1);
  });

  it("blocks reminder send at free monthly limit", async () => {
    const pendingRows = [{ id: "r2", profile_id: "u2", idempotency_key: "r2:0", invoices: [{ amount_cents: 1500, due_date: "2026-07-10", status: "unpaid", clients: [{ name: "B", email: "b@example.com" }] }], profiles: [{ default_tone: "neutral" }] }];

    fromMock.mockImplementation((table: string) => {
      if (table === "reminders") {
        const selectChain = {
          eq: vi.fn(() => selectChain),
          lte: vi.fn(() => selectChain),
          limit: vi.fn(async () => ({ data: pendingRows })),
          gte: vi.fn(async () => ({ count: 20 })),
        };

        return {
          select: vi.fn(() => selectChain),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  select: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { id: "r2" }, error: null })) })),
                })),
                eq: vi.fn(async () => ({ error: null })),
              })),
            })),
          })),
        };
      }

      if (table === "subscriptions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { plan: "free" } })) })),
            })),
          })),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(async () => ({ count: 20 })),
            })),
          })),
        })),
      };
    });

    const { POST } = await import("@/app/api/cron/send-reminders/route");
    const response = await POST(
      new Request("http://localhost/api/cron/send-reminders", {
        method: "POST",
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.sent).toBe(0);
    expect(payload.blocked).toBe(1);
    expect(payload.upgradeHint).toBe("/settings/billing");
  });
});
