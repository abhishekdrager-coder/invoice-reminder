-- Backfill default sequences for existing profiles.
insert into public.reminder_sequences (profile_id, name, is_default)
select p.id, 'Default Sequence', true
from public.profiles p
where not exists (
  select 1 from public.reminder_sequences rs where rs.profile_id = p.id and rs.is_default = true
);

insert into public.reminder_steps (profile_id, sequence_id, day_offset, subject_template, body_template)
select rs.profile_id, rs.id, step.day_offset, step.subject_template, step.body_template
from public.reminder_sequences rs
cross join (
  values
    (-2, 'Friendly reminder: invoice due soon', 'Hi {{client_name}}, this is a reminder your invoice of {{amount}} is due on {{due_date}}.'),
    (0, 'Invoice due today', 'Hi {{client_name}}, your invoice of {{amount}} is due today. Thanks in advance.'),
    (3, 'Payment reminder: invoice overdue', 'Hi {{client_name}}, this invoice is now overdue by 3 days. Please share payment status.'),
    (7, 'Final reminder: overdue invoice', 'Hi {{client_name}}, this is a final reminder for the overdue invoice of {{amount}}.')
) as step(day_offset, subject_template, body_template)
where rs.is_default = true
and not exists (
  select 1 from public.reminder_steps s where s.sequence_id = rs.id and s.day_offset = step.day_offset
);
