-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.invoice_status as enum ('unpaid', 'paid', 'disputed');
create type public.reminder_status as enum ('pending', 'sent', 'failed', 'skipped');
create type public.tone_type as enum ('polite', 'neutral', 'firm');
create type public.inbound_intent as enum ('paid', 'promise_to_pay', 'dispute', 'unknown');
create type public.plan_type as enum ('free', 'starter', 'pro');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'owner' check (role in ('owner')),
  default_tone public.tone_type not null default 'neutral',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(profile_id, email)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  due_date date not null,
  status public.invoice_status not null default 'unpaid',
  invoice_number text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reminder_sequences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Default Sequence',
  is_default boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reminder_steps (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sequence_id uuid not null references public.reminder_sequences(id) on delete cascade,
  day_offset integer not null,
  subject_template text not null,
  body_template text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(sequence_id, day_offset)
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status public.reminder_status not null default 'pending',
  idempotency_key text not null unique,
  final_subject text,
  final_body text,
  failure_reason text,
  intent_outcome public.inbound_intent,
  recovered_amount_cents integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inbound_replies (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  from_email text,
  body_text text not null,
  intent public.inbound_intent not null default 'unknown',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan public.plan_type not null default 'free',
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_invoices_profile_status on public.invoices(profile_id, status);
create index if not exists idx_reminders_profile_status_time on public.reminders(profile_id, status, scheduled_for);
create index if not exists idx_inbound_replies_invoice_id on public.inbound_replies(invoice_id);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

create trigger set_invoices_updated_at
before update on public.invoices
for each row execute procedure public.handle_updated_at();

create trigger set_reminders_updated_at
before update on public.reminders
for each row execute procedure public.handle_updated_at();

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute procedure public.handle_updated_at();

create or replace function public.create_default_sequence(p_profile_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_sequence_id uuid;
begin
  insert into public.reminder_sequences (profile_id, name, is_default)
  values (p_profile_id, 'Default Sequence', true)
  returning id into v_sequence_id;

  insert into public.reminder_steps (profile_id, sequence_id, day_offset, subject_template, body_template)
  values
    (p_profile_id, v_sequence_id, -2, 'Friendly reminder: invoice due soon', 'Hi {{client_name}}, this is a reminder your invoice of {{amount}} is due on {{due_date}}.'),
    (p_profile_id, v_sequence_id, 0, 'Invoice due today', 'Hi {{client_name}}, your invoice of {{amount}} is due today. Thanks in advance.'),
    (p_profile_id, v_sequence_id, 3, 'Payment reminder: invoice overdue', 'Hi {{client_name}}, this invoice is now overdue by 3 days. Please share payment status.'),
    (p_profile_id, v_sequence_id, 7, 'Final reminder: overdue invoice', 'Hi {{client_name}}, this is a final reminder for the overdue invoice of {{amount}}.');
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  insert into public.subscriptions (profile_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (profile_id) do nothing;

  perform public.create_default_sequence(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.reminder_sequences enable row level security;
alter table public.reminder_steps enable row level security;
alter table public.reminders enable row level security;
alter table public.inbound_replies enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "clients own" on public.clients for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "invoices own" on public.invoices for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "sequences own" on public.reminder_sequences for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "steps own" on public.reminder_steps for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "reminders own" on public.reminders for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "inbound replies own" on public.inbound_replies
for select
using (
  exists (
    select 1 from public.invoices i where i.id = invoice_id and i.profile_id = auth.uid()
  )
);

create policy "subscriptions own" on public.subscriptions for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
