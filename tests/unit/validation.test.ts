import { describe, expect, it } from "vitest";
import { invoiceSchema } from "@/lib/validation";

describe("invoice validation", () => {
  it("accepts valid invoice payload", () => {
    const result = invoiceSchema.safeParse({
      clientName: "Acme Corp",
      clientEmail: "billing@acme.com",
      amount: "1500.50",
      dueDate: "2026-07-20",
      invoiceNumber: "INV-100",
      notes: "Thank you",
    });

    expect(result.success).toBe(true);
  });

  it("rejects malformed email and zero amount", () => {
    const result = invoiceSchema.safeParse({
      clientName: "A",
      clientEmail: "bad-email",
      amount: 0,
      dueDate: "2026-07-20",
    });

    expect(result.success).toBe(false);
  });
});
