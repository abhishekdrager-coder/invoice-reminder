-- Security, owner role model, and Stripe webhook replay protections.

create type public.profile_role as enum ('user', 'admin', 'owner');

alter table public.profiles
add column if not exists is_suspended boolean not null default false;

update public.profiles
set is_suspended = coalesce(suspended, false)
where true;

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
alter column role type public.profile_role
using role::public.profile_role;

alter table public.profiles
alter column role set default 'user'::public.profile_role;

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  processed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_stripe_webhook_events_created_at
  on public.stripe_webhook_events(created_at desc);

alter table public.stripe_webhook_events enable row level security;

create policy "stripe webhook events admin read"
on public.stripe_webhook_events
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);

-- Expand admin policies to include owner role.
do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'app_logs' and policyname = 'app logs admin read'
  ) then
    drop policy "app logs admin read" on public.app_logs;
  end if;
end$$;

create policy "app logs admin read"
on public.app_logs
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);

drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);

drop policy if exists "invoices admin read" on public.invoices;
create policy "invoices admin read" on public.invoices
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);

drop policy if exists "clients admin read" on public.clients;
create policy "clients admin read" on public.clients
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);

drop policy if exists "reminders admin read" on public.reminders;
create policy "reminders admin read" on public.reminders
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);

drop policy if exists "subscriptions admin read" on public.subscriptions;
create policy "subscriptions admin read" on public.subscriptions
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);

drop policy if exists "inbound admin read" on public.inbound_replies;
create policy "inbound admin read" on public.inbound_replies
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);
