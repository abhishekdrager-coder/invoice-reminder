import { describe, expect, it } from "vitest";
import { evaluateLimit } from "@/lib/quota";

describe("plan limit checks", () => {
  it("free limits invoices", () => {
    const result = evaluateLimit("free", 5, 1, "invoices");
    expect(result.allowed).toBe(false);
  });

  it("premium_lite allows more than free", () => {
    const result = evaluateLimit("premium_lite", 10, 1, "invoices");
    expect(result.allowed).toBe(true);
  });

  it("premium_pro reminders effectively unlimited", () => {
    const result = evaluateLimit("premium_pro", 1000, 1000, "reminders");
    expect(result.allowed).toBe(true);
  });
});
