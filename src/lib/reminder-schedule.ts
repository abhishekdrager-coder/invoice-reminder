import { addDays } from "date-fns";

export const DEFAULT_REMINDER_OFFSETS = [-2, 0, 3, 7] as const;

export function buildReminderSchedule(dueDate: string, offsets = DEFAULT_REMINDER_OFFSETS) {
  return offsets.map((offset) => ({
    dayOffset: offset,
    scheduledFor: addDays(new Date(dueDate), offset).toISOString(),
  }));
}
