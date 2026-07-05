"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";

import { updateReminderStep } from "@/app/(dashboard)/settings/reminders/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ReminderStepRow } from "@/types";

type ReminderStepFormProps = {
  step: ReminderStepRow;
};

export function ReminderStepForm({ step }: ReminderStepFormProps) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState({
    subjectTemplate: step.subject_template,
    bodyTemplate: step.body_template,
    tone: step.tone,
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateReminderStep({
        id: step.id,
        subjectTemplate: values.subjectTemplate,
        bodyTemplate: values.bodyTemplate,
        tone: values.tone,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Day {step.days_offset >= 0 ? `+${step.days_offset}` : step.days_offset}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input label="Subject template" value={values.subjectTemplate} onChange={(event) => setValues((current) => ({ ...current, subjectTemplate: event.target.value }))} />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Body template</span>
            <textarea
              className="min-h-40 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={values.bodyTemplate}
              onChange={(event) => setValues((current) => ({ ...current, bodyTemplate: event.target.value }))}
            />
          </label>
          <Select label="Tone" value={values.tone} onChange={(event) => setValues((current) => ({ ...current, tone: event.target.value as typeof values.tone }))}>
            <option value="polite">Polite</option>
            <option value="neutral">Neutral</option>
            <option value="firm">Firm</option>
          </Select>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Preview</p>
            <p className="mt-3 font-medium">{values.subjectTemplate}</p>
            <p className="mt-2 whitespace-pre-wrap">{values.bodyTemplate}</p>
          </div>
          <Button type="submit" loading={isPending}>Save step</Button>
        </form>
      </CardContent>
    </Card>
  );
}
