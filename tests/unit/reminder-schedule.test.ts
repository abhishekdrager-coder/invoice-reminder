import { describe, expect, it } from "vitest";
import { buildReminderSchedule } from "@/lib/reminder-schedule";

describe("reminder schedule calculation", () => {
  it("returns default four reminder steps", () => {
    const entries = buildReminderSchedule("2026-07-10");
    expect(entries).toHaveLength(4);
    expect(entries.map((e) => e.dayOffset)).toEqual([-2, 0, 3, 7]);
  });
});
