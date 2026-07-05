-- Full invoice generator model: business profiles, invoice lifecycle, line items, public links, and events.

create table if not exists public.business_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  legal_business_name text,
  display_business_name text,
  owner_full_name text,
  business_email text,
  business_phone text,
  website text,
  logo_url text,
  brand_accent_color text,
  tax_id_label text,
  tax_id_value text,
  address_line1 text,
  address_line2 text,
  city text,
  province_state text,
  postal_code text,
  country text,
  default_currency text not null default 'USD',
  default_tax_rate_percent numeric(8,3) not null default 0,
  invoice_prefix text not null default 'INV-',
  default_payment_terms_days integer not null default 14,
  default_notes text,
  default_footer text,
  bank_transfer_details text,
  etransfer_email text,
  payment_instructions text,
  accepted_payment_methods text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.business_profiles enable row level security;

create policy "business profile own" on public.business_profiles
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "business profile admin read" on public.business_profiles
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);

create trigger set_business_profiles_updated_at
before update on public.business_profiles
for each row execute procedure public.handle_updated_at();

insert into public.business_profiles (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

create or replace function public.ensure_business_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_profiles (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_ensure_business_profile on public.profiles;
create trigger trg_ensure_business_profile
after insert on public.profiles
for each row execute procedure public.ensure_business_profile();

alter table public.invoices
add column if not exists issue_date date not null default current_date,
add column if not exists lifecycle_status text not null default 'draft' check (lifecycle_status in ('draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'canceled')),
add column if not exists client_company text,
add column if not exists billing_address_line1 text,
add column if not exists billing_address_line2 text,
add column if not exists billing_city text,
add column if not exists billing_province_state text,
add column if not exists billing_postal_code text,
add column if not exists billing_country text,
add column if not exists currency text not null default 'USD',
add column if not exists tax_mode text not null default 'exclusive' check (tax_mode in ('inclusive', 'exclusive')),
add column if not exists discount_mode text not null default 'fixed' check (discount_mode in ('fixed', 'percent')),
add column if not exists discount_value integer not null default 0,
add column if not exists subtotal_cents integer not null default 0,
add column if not exists tax_total_cents integer not null default 0,
add column if not exists discount_total_cents integer not null default 0,
add column if not exists grand_total_cents integer not null default 0,
add column if not exists amount_paid_cents integer not null default 0,
add column if not exists amount_due_cents integer not null default 0,
add column if not exists payment_instructions text,
add column if not exists footer text,
add column if not exists public_token text unique,
add column if not exists first_viewed_at timestamptz,
add column if not exists latest_viewed_at timestamptz,
add column if not exists sent_at timestamptz,
add column if not exists last_email_sent_at timestamptz,
add column if not exists canceled_at timestamptz,
add column if not exists view_count integer not null default 0,
add column if not exists email_delivery_status text;

update public.invoices
set subtotal_cents = amount_cents,
    grand_total_cents = amount_cents,
    amount_due_cents = amount_cents,
    lifecycle_status = case
      when status = 'paid' then 'paid'
      when due_date < current_date and status = 'unpaid' then 'overdue'
      else 'draft'
    end
where subtotal_cents = 0 and grand_total_cents = 0;

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  sort_order integer not null default 0,
  description text not null,
  qty integer not null check (qty > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  tax_rate_percent numeric(8,3),
  line_total_cents integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_invoice_line_items_invoice on public.invoice_line_items(invoice_id, sort_order);

alter table public.invoice_line_items enable row level security;

create policy "invoice line items own" on public.invoice_line_items
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "invoice line items admin read" on public.invoice_line_items
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);

create trigger set_invoice_line_items_updated_at
before update on public.invoice_line_items
for each row execute procedure public.handle_updated_at();

create table if not exists public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_invoice_events_invoice_time on public.invoice_events(invoice_id, created_at desc);
create index if not exists idx_invoice_events_profile_time on public.invoice_events(profile_id, created_at desc);

alter table public.invoice_events enable row level security;

create policy "invoice events own" on public.invoice_events
for select
using (auth.uid() = profile_id);

create policy "invoice events service write" on public.invoice_events
for insert
with check (auth.uid() = profile_id);

create policy "invoice events admin read" on public.invoice_events
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'owner')
  )
);

create or replace function public.bump_invoice_view(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invoices
  set
    first_viewed_at = coalesce(first_viewed_at, timezone('utc', now())),
    latest_viewed_at = timezone('utc', now()),
    view_count = coalesce(view_count, 0) + 1,
    lifecycle_status = case when lifecycle_status in ('draft', 'sent') then 'viewed' else lifecycle_status end
  where id = p_invoice_id;
end;
$$;
