-- Support KPI metrics requiring paid timestamps and optional ad tracking.

alter table public.invoices
add column if not exists paid_at timestamptz;

create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ad_events_created_at on public.ad_events(created_at desc);
create index if not exists idx_ad_events_profile_id on public.ad_events(profile_id);

alter table public.ad_events enable row level security;

create policy "ad events own" on public.ad_events
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "ad events admin read" on public.ad_events
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
