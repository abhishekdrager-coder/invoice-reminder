import { describe, expect, it } from "vitest";
import { detectIntent } from "@/lib/intent";

describe("inbound reply intent parser", () => {
  it("detects paid", () => {
    expect(detectIntent("I already paid this invoice yesterday")).toBe("paid");
  });

  it("detects promise to pay", () => {
    expect(detectIntent("I will pay by Friday")).toBe("promise_to_pay");
  });

  it("detects dispute", () => {
    expect(detectIntent("I dispute this amount")).toBe("dispute");
  });

  it("falls back to unknown", () => {
    expect(detectIntent("Thanks for checking in")).toBe("unknown");
  });
});
