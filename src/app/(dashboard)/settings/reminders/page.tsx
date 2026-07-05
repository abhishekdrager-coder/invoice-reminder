import { ReminderStepForm } from "@/components/reminders/ReminderStepForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ReminderSequenceRow, ReminderStepRow } from "@/types";

export const dynamic = "force-dynamic";

export default async function ReminderSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [sequenceResponse, stepsResponse] = await Promise.all([
    supabase.from("reminder_sequences").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    supabase
      .from("reminder_steps")
      .select("id, sequence_id, days_offset, subject_template, body_template, tone, created_at")
      .in(
        "sequence_id",
        ((await supabase.from("reminder_sequences").select("id").eq("user_id", user.id)).data ?? []).map((sequence) => sequence.id),
      )
      .order("days_offset", { ascending: true }),
  ]);

  const sequences = (sequenceResponse.data ?? []) as ReminderSequenceRow[];
  const steps = (stepsResponse.data ?? []) as ReminderStepRow[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-950">Reminder sequences</h2>
        <p className="mt-1 text-slate-500">Tune your subject lines, body copy, and tone for every reminder step.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sequences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {sequences.map((sequence) => (
              <div key={sequence.id} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">{sequence.name}</p>
                <p>{sequence.is_default ? "Default workflow" : "Custom workflow"}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {steps.map((step) => (
          <ReminderStepForm key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}
