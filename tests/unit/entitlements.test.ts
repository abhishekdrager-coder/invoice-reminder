import { describe, expect, it } from "vitest";
import { resolveEntitlements } from "@/lib/entitlements";

describe("entitlement resolver", () => {
  it("returns free entitlements", () => {
    const result = resolveEntitlements("free");
    expect(result.adsEnabled).toBe(true);
    expect(result.maxActiveInvoices).toBe(5);
  });

  it("returns premium entitlements", () => {
    const result = resolveEntitlements("premium_lite");
    expect(result.adsEnabled).toBe(false);
    expect(result.premium).toBe(true);
  });
});
