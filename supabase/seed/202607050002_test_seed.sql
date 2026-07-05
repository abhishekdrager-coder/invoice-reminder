-- Test seed data for QA and integration checks.
-- Replace UUID values as needed for your local auth users.

insert into public.profiles (id, email, full_name, role, default_tone)
values
  ('00000000-0000-0000-0000-000000000001', 'qa-user@example.com', 'QA User', 'user', 'neutral'),
  ('00000000-0000-0000-0000-000000000002', 'qa-admin@example.com', 'QA Admin', 'admin', 'firm')
on conflict (id) do nothing;

insert into public.subscriptions (profile_id, plan, status)
values
  ('00000000-0000-0000-0000-000000000001', 'free', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'premium', 'active')
on conflict (profile_id) do nothing;
