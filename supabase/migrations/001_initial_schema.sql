create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  company text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  invoice_number text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'disputed')),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, invoice_number)
);

create table if not exists public.reminder_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reminder_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.reminder_sequences(id) on delete cascade,
  days_offset integer not null,
  subject_template text not null,
  body_template text not null,
  tone text not null default 'polite' check (tone in ('polite', 'neutral', 'firm')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  step_id uuid not null references public.reminder_steps(id) on delete cascade,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inbound_replies (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  from_email text not null,
  subject text,
  body text,
  detected_intent text not null default 'unknown' check (detected_intent in ('paid', 'promise_to_pay', 'dispute', 'unknown')),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_clients_email on public.clients(user_id, email);
create index if not exists idx_invoices_user_id on public.invoices(user_id);
create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_status on public.invoices(user_id, status);
create index if not exists idx_invoices_due_date on public.invoices(user_id, due_date);
create index if not exists idx_reminder_sequences_user_id on public.reminder_sequences(user_id);
create index if not exists idx_reminder_steps_sequence_id on public.reminder_steps(sequence_id);
create index if not exists idx_reminders_invoice_id on public.reminders(invoice_id);
create index if not exists idx_reminders_scheduled_status on public.reminders(status, scheduled_at);
create index if not exists idx_inbound_replies_invoice_id on public.inbound_replies(invoice_id);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_customer on public.subscriptions(stripe_customer_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.reminder_sequences enable row level security;
alter table public.reminder_steps enable row level security;
alter table public.reminders enable row level security;
alter table public.inbound_replies enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);

create policy "clients_manage_own" on public.clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoices_manage_own" on public.invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sequences_manage_own" on public.reminder_sequences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "steps_select_own" on public.reminder_steps for select using (
  exists (
    select 1 from public.reminder_sequences rs
    where rs.id = reminder_steps.sequence_id and rs.user_id = auth.uid()
  )
);
create policy "steps_insert_own" on public.reminder_steps for insert with check (
  exists (
    select 1 from public.reminder_sequences rs
    where rs.id = reminder_steps.sequence_id and rs.user_id = auth.uid()
  )
);
create policy "steps_update_own" on public.reminder_steps for update using (
  exists (
    select 1 from public.reminder_sequences rs
    where rs.id = reminder_steps.sequence_id and rs.user_id = auth.uid()
  )
);
create policy "steps_delete_own" on public.reminder_steps for delete using (
  exists (
    select 1 from public.reminder_sequences rs
    where rs.id = reminder_steps.sequence_id and rs.user_id = auth.uid()
  )
);
create policy "reminders_select_own" on public.reminders for select using (
  exists (
    select 1 from public.invoices i where i.id = reminders.invoice_id and i.user_id = auth.uid()
  )
);
create policy "reminders_manage_own" on public.reminders for all using (
  exists (
    select 1 from public.invoices i where i.id = reminders.invoice_id and i.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.invoices i where i.id = reminders.invoice_id and i.user_id = auth.uid()
  )
);
create policy "replies_select_own" on public.inbound_replies for select using (
  exists (
    select 1 from public.invoices i where i.id = inbound_replies.invoice_id and i.user_id = auth.uid()
  )
);
create policy "subscriptions_manage_own" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.email, '')
  )
  on conflict (user_id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      updated_at = timezone('utc', now());

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();
