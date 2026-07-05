"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

const reminderStepSchema = z.object({
  id: z.string().uuid(),
  subjectTemplate: z.string().min(5, "Subject template must be at least 5 characters."),
  bodyTemplate: z.string().min(10, "Body template must be at least 10 characters."),
  tone: z.enum(["polite", "neutral", "firm"]),
});

export async function updateReminderStep(input: z.infer<typeof reminderStepSchema>): Promise<ActionResult> {
  const parsed = reminderStepSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid reminder step." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  const { error } = await supabase
    .from("reminder_steps")
    .update({
      subject_template: parsed.data.subjectTemplate,
      body_template: parsed.data.bodyTemplate,
      tone: parsed.data.tone,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/settings/reminders");
  return { success: true, message: "Reminder step updated." };
}
