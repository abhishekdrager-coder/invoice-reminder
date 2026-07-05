-- Add processing status for reliable cron claiming.
alter type public.reminder_status add value if not exists 'processing';

-- Expand user roles and profile controls.
alter table public.profiles alter column role drop default;
update public.profiles set role = 'user' where role = 'owner';
alter table public.profiles alter column role set default 'user';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));
alter table public.profiles add column if not exists suspended boolean not null default false;
alter table public.profiles add column if not exists last_active_at timestamptz;

-- Add reminder processing timestamp.
alter table public.reminders add column if not exists processing_at timestamptz;

-- Add premium plan option.
alter type public.plan_type add value if not exists 'premium';

-- Centralized app logs for observability.
create table if not exists public.app_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  level text not null check (level in ('info', 'warn', 'error')),
  context text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_app_logs_created_at on public.app_logs(created_at desc);
create index if not exists idx_app_logs_level on public.app_logs(level);

alter table public.app_logs enable row level security;

create policy "app logs admin read" on public.app_logs
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Admin read-access policies.
create policy "profiles admin read" on public.profiles
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "invoices admin read" on public.invoices
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "clients admin read" on public.clients
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "reminders admin read" on public.reminders
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "subscriptions admin read" on public.subscriptions
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "inbound admin read" on public.inbound_replies
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
