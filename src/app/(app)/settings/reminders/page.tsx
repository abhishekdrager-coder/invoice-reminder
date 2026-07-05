import { redirect } from "next/navigation";
import { requireUser, requireUserContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { sanitizeText } from "@/lib/sanitize";

export default async function ReminderSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  async function updateTone(formData: FormData) {
    "use server";
    const currentUser = await requireUserContext();
    const tone = sanitizeText(formData.get("tone")) || "neutral";
    if (!["polite", "neutral", "firm"].includes(tone)) {
      redirect("/settings/reminders");
    }
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({ default_tone: tone })
      .eq("id", currentUser.userId);

    redirect("/settings/reminders");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_tone")
    .eq("id", user.id)
    .single();

  const { data: steps } = await supabase
    .from("reminder_steps")
    .select("day_offset,subject_template,body_template")
    .eq("profile_id", user.id)
    .order("day_offset", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reminder settings</h1>

      <form action={updateTone} className="rounded-lg border border-stone-200 bg-white p-5">
        <label className="mb-2 block text-sm font-medium">Default AI tone</label>
        <select name="tone" defaultValue={profile?.default_tone ?? "neutral"} className="rounded border border-stone-300 px-3 py-2">
          <option value="polite">Polite</option>
          <option value="neutral">Neutral</option>
          <option value="firm">Firm</option>
        </select>
        <div className="mt-3">
          <Button type="submit">Save preferences</Button>
        </div>
      </form>

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-medium">Default sequence steps</h2>
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          {(steps ?? []).map((step) => (
            <li key={step.day_offset} className="rounded border border-stone-200 p-3">
              <p className="font-medium">Day {step.day_offset >= 0 ? `+${step.day_offset}` : step.day_offset}</p>
              <p className="text-xs text-stone-500">{step.subject_template}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
