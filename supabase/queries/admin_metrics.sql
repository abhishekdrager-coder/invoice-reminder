-- Invoice Copilot admin KPI queries (schema-corrected).
-- Note: this project uses profile_id (not user_id).

-- 1) Total users
select count(*) as total_users
from profiles;

-- 2) New users last 7 days
select count(*) as new_users_7d
from profiles
where created_at >= now() - interval '7 days';

-- 3) Active users last 7 days (created invoice OR reminder activity)
select count(distinct profile_id) as active_users_7d
from (
  select profile_id from invoices where created_at >= now() - interval '7 days'
  union
  select profile_id from reminders where created_at >= now() - interval '7 days'
) t;

-- 4) Activation rate (users with >=1 invoice / total users)
select
  (count(distinct i.profile_id)::decimal / nullif((select count(*) from profiles), 0)) as activation_rate
from invoices i;

-- 5) Total invoices
select count(*) as total_invoices
from invoices;

-- 6) Invoices created last 30 days
select count(*) as invoices_30d
from invoices
where created_at >= now() - interval '30 days';

-- 7) Outstanding amount
select coalesce(sum(amount_cents), 0) / 100.0 as outstanding_amount
from invoices
where status = 'unpaid';

-- 8) Overdue amount
select coalesce(sum(amount_cents), 0) / 100.0 as overdue_amount
from invoices
where status = 'unpaid'
  and due_date < current_date;

-- 9) Recovered amount last 30 days
select coalesce(sum(amount_cents), 0) / 100.0 as recovered_30d
from invoices
where status = 'paid'
  and paid_at >= now() - interval '30 days';

-- 10) Recovery rate last 30 days (paid in 30d / due in 30d)
select
  (
    select count(*)::decimal
    from invoices
    where status = 'paid'
      and paid_at >= now() - interval '30 days'
  ) / nullif((
    select count(*)::decimal
    from invoices
    where due_date >= current_date - interval '30 days'
  ), 0) as recovery_rate_30d;

-- 11) Reminders sent last 30 days
select count(*) as reminders_sent_30d
from reminders
where status = 'sent'
  and sent_at >= now() - interval '30 days';

-- 12) Reminder failure rate last 30 days
select
  (count(*) filter (where status = 'failed')::decimal / nullif(count(*), 0)) as reminder_failure_rate_30d
from reminders
where created_at >= now() - interval '30 days';

-- 13) Avg days-to-pay (paid invoices)
select avg(extract(epoch from (paid_at::timestamp - due_date::timestamp)) / 86400.0) as avg_days_to_pay
from invoices
where status = 'paid'
  and paid_at is not null;

-- 14) MRR (mapped to current plans)
select
  coalesce(sum(
    case
      when plan = 'premium_lite' and status = 'active' then 9
      when plan = 'premium_pro' and status = 'active' then 19
      else 0
    end
  ), 0) as mrr_usd
from subscriptions;

-- 15) Free -> paid conversion
select
(
  select count(*)::decimal
  from subscriptions
  where plan in ('premium_lite', 'premium_pro') and status = 'active'
) / nullif((select count(*)::decimal from profiles), 0) as free_to_paid_conversion;

-- 16) Churned subscriptions (last 30d)
select count(*) as churned_30d
from subscriptions
where status in ('canceled', 'incomplete_expired')
  and current_period_end >= now() - interval '30 days';

-- 17) Ad impressions (requires ad_events)
select count(*) as ad_impressions_30d
from ad_events
where event_type = 'impression'
  and created_at >= now() - interval '30 days';

-- 18) Ad CTR (requires ad_events)
select
  (count(*) filter (where event_type = 'click')::decimal /
   nullif(count(*) filter (where event_type = 'impression'), 0)) as ad_ctr_30d
from ad_events
where created_at >= now() - interval '30 days';
