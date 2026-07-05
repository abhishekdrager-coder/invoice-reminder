create or replace function public.create_default_reminder_sequence(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sequence_id uuid;
begin
  if exists (
    select 1 from public.reminder_sequences where user_id = target_user_id and is_default = true
  ) then
    return;
  end if;

  insert into public.reminder_sequences (user_id, name, is_default)
  values (target_user_id, 'Default sequence', true)
  returning id into sequence_id;

  insert into public.reminder_steps (sequence_id, days_offset, subject_template, body_template, tone)
  values
    (sequence_id, -2, 'Friendly reminder: invoice {{invoice_number}} is due soon', 'Hi {{client_name}},

Just a quick reminder that invoice {{invoice_number}} for {{amount}} is due on {{due_date}}. Please let me know if you need anything from me to process it.

Thanks,
{{sender_name}}', 'polite'),
    (sequence_id, 0, 'Invoice {{invoice_number}} is due today', 'Hi {{client_name}},

Invoice {{invoice_number}} for {{amount}} is due today. Sharing a gentle reminder in case it helps your team prioritize payment.

Best,
{{sender_name}}', 'neutral'),
    (sequence_id, 3, 'Follow-up on overdue invoice {{invoice_number}}', 'Hi {{client_name}},

I wanted to follow up on invoice {{invoice_number}}, which is now 3 days overdue. Please confirm the payment status or share an expected payment date.

Thank you,
{{sender_name}}', 'neutral'),
    (sequence_id, 7, 'Urgent: invoice {{invoice_number}} is now overdue', 'Hi {{client_name}},

Invoice {{invoice_number}} remains unpaid 7 days past the due date. Please reply today with a payment update so we can avoid further escalation.

Regards,
{{sender_name}}', 'firm');
end;
$$;

create or replace function public.handle_new_user_default_sequence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_default_reminder_sequence(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sequence on auth.users;
create trigger on_auth_user_created_sequence
after insert on auth.users
for each row execute procedure public.handle_new_user_default_sequence();
