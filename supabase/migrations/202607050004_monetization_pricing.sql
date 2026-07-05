-- Monetization and pricing alignment for free + premium_lite + premium_pro.

alter type public.plan_type add value if not exists 'premium_lite';
alter type public.plan_type add value if not exists 'premium_pro';

-- Keep backward compatibility with existing plan values by data migration.
update public.subscriptions
set plan = 'premium_lite'
where plan = 'starter';

update public.subscriptions
set plan = 'premium_pro'
where plan in ('pro', 'premium');

-- Ensure subscriptions has user_id alias for compatibility.
alter table public.subscriptions
add column if not exists user_id uuid references public.profiles(id) on delete cascade;

update public.subscriptions
set user_id = profile_id
where user_id is null;

alter table public.subscriptions
alter column user_id set not null;

create unique index if not exists idx_subscriptions_user_id_unique on public.subscriptions(user_id);

-- Keep profile_id and user_id in sync.
create or replace function public.sync_subscription_user_profile_ids()
returns trigger
language plpgsql
as $$
begin
  if new.profile_id is null and new.user_id is not null then
    new.profile_id = new.user_id;
  end if;

  if new.user_id is null and new.profile_id is not null then
    new.user_id = new.profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_subscription_user_profile_ids on public.subscriptions;
create trigger trg_sync_subscription_user_profile_ids
before insert or update on public.subscriptions
for each row execute procedure public.sync_subscription_user_profile_ids();

-- Plan limits helper function required by monetization spec.
create or replace function public.getUserPlanLimits(p_user_id uuid)
returns table (
  plan public.plan_type,
  max_active_invoices integer,
  max_reminders_per_month integer,
  ads_enabled boolean
)
language sql
stable
as $$
  with active_sub as (
    select s.plan
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.status in ('active', 'trialing')
    order by s.updated_at desc
    limit 1
  )
  select
    coalesce((select plan from active_sub), 'free'::public.plan_type) as plan,
    case coalesce((select plan from active_sub), 'free'::public.plan_type)
      when 'free' then 5
      when 'premium_lite' then 30
      else 2147483647
    end as max_active_invoices,
    case coalesce((select plan from active_sub), 'free'::public.plan_type)
      when 'free' then 20
      when 'premium_lite' then 200
      else 2147483647
    end as max_reminders_per_month,
    case coalesce((select plan from active_sub), 'free'::public.plan_type)
      when 'free' then true
      else false
    end as ads_enabled;
$$;

-- Extend ad_events for monetization analytics schema.
alter table public.ad_events
add column if not exists user_id uuid references public.profiles(id) on delete cascade;

alter table public.ad_events
add column if not exists placement text not null default 'dashboard_top';

update public.ad_events
set user_id = profile_id
where user_id is null;

create or replace function public.sync_ad_event_user_profile_ids()
returns trigger
language plpgsql
as $$
begin
  if new.profile_id is null and new.user_id is not null then
    new.profile_id = new.user_id;
  end if;

  if new.user_id is null and new.profile_id is not null then
    new.user_id = new.profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_ad_event_user_profile_ids on public.ad_events;
create trigger trg_sync_ad_event_user_profile_ids
before insert or update on public.ad_events
for each row execute procedure public.sync_ad_event_user_profile_ids();

create index if not exists idx_ad_events_user_placement on public.ad_events(user_id, placement, created_at desc);
