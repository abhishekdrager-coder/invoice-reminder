# Invoice Copilot

Invoice Copilot is a Next.js SaaS app for automating invoice reminders with plan-aware limits, Stripe billing, admin observability, and reply intent automation.

## Features

- Email/password and Google auth via Supabase
- Invoice create/list/update and CSV import
- Automated reminder schedule (-2, 0, +3, +7 days)
- Cron-based reminder sender with claim idempotency and retry/backoff
- AI tone rewrite endpoint with rate limiting
- Inbound reply intent parsing that can auto-mark paid and stop future reminders
- Stripe subscriptions for free, premium_lite, premium_pro
- Strict server-side quota enforcement
- Ad-supported free plan and ad-free premium experience
- Admin dashboard with RBAC and KPI widgets

## Tech Stack

- Next.js (App Router), TypeScript, Tailwind
- Supabase (Postgres + Auth)
- Stripe
- Resend
- OpenAI
- Vitest + Playwright

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase project
- Stripe account (products + webhook)
- Resend account
- OpenAI API key

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Fill required environment variables in .env.local:

- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PREMIUM_LITE_PRICE_ID
- NEXT_PUBLIC_STRIPE_PREMIUM_PRO_PRICE_ID
- RESEND_API_KEY
- EMAIL_FROM
- OPENAI_API_KEY
- OPENAI_MODEL
- CRON_SECRET
- INBOUND_SECRET
- SHOW_ADS
- ADMIN_BOOTSTRAP_EMAIL (optional)

## Database Migrations and Seed

Use a Supabase Postgres connection string in SUPABASE_DB_URL.

```bash
SUPABASE_DB_URL="postgresql://..." npm run db:migrate
SUPABASE_DB_URL="postgresql://..." npm run db:seed
```

Migrations include:

- supabase/migrations/202607050001_init.sql
- supabase/migrations/202607050002_reliability_admin.sql
- supabase/migrations/202607050003_metrics_support.sql
- supabase/migrations/202607050004_monetization_pricing.sql

## Local Run

```bash
npm run dev
```

Open http://localhost:3000.

## Test Run

Quick CI-equivalent checks:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
```

E2E tests:

```bash
E2E_EMAIL="user@example.com" \
E2E_PASSWORD="password" \
E2E_FREE_EMAIL="free@example.com" \
E2E_FREE_PASSWORD="password" \
E2E_PREMIUM_EMAIL="pro@example.com" \
E2E_PREMIUM_PASSWORD="password" \
CRON_SECRET="your-cron-secret" \
npm run test:e2e
```

## Cron Setup

Reminder sender endpoint:

- POST /api/cron/send-reminders
- Authorization header must be: Bearer $CRON_SECRET

Example:

```bash
curl -X POST http://localhost:3000/api/cron/send-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

Configure your scheduler (Vercel Cron, GitHub Actions, or external scheduler) to call the same endpoint with the same token.

## Stripe Setup

1. Create two recurring prices in Stripe:
- Premium Lite (maps to NEXT_PUBLIC_STRIPE_PREMIUM_LITE_PRICE_ID)
- Premium Pro (maps to NEXT_PUBLIC_STRIPE_PREMIUM_PRO_PRICE_ID)

2. Add webhook endpoint:

- POST http://localhost:3000/api/stripe/webhook

3. Subscribe to events:

- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted

## Admin Mode

Bootstrap an admin user:

```bash
ADMIN_BOOTSTRAP_EMAIL="admin@example.com" npm run admin:bootstrap
```

Admin routes:

- /admin/overview
- /admin/users
- /admin/invoices
- /admin/reminders
- /admin/billing
- /admin/logs

RBAC is enforced both in middleware and server-side guards.

## GitHub Actions

CI workflow is in .github/workflows/ci.yml and runs:

- lint
- typecheck
- unit tests
- integration tests
- Playwright setup and e2e tests
