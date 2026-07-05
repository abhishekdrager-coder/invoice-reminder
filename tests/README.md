# Test Database Strategy

Use a dedicated Supabase project (or Postgres schema) for tests.

- Apply migrations in order from `supabase/migrations/*`.
- Seed defaults with `supabase/seed/202607050001_default_sequence.sql`.
- Seed QA users with `supabase/seed/202607050002_test_seed.sql`.
- Never point tests at production database.

Recommended env vars:

- `SUPABASE_DB_URL` for `psql` migration/seed scripts
- App env vars from `.env.example`
