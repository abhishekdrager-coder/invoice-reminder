# Invoice Copilot

A production-ready MVP SaaS that helps freelancers and small businesses automatically send invoice payment reminders and track paid/unpaid status.

## Tech Stack

- **Next.js 14+** (App Router) + TypeScript
- **Tailwind CSS**
- **Supabase** (Auth + Postgres)
- **Stripe** subscriptions
- **Resend** (email sending)
- **OpenAI API** (tone rewrite)
- **Zod** validation
- Deploy-ready for **Vercel**

## Features

- Email/password + Google OAuth authentication
- Dashboard with outstanding amount, overdue count, recovered this month
- Invoice CRUD with client management
- CSV import for invoices
- Automated reminder sequences (day -2, 0, +3, +7 relative to due date)
- AI-powered reminder tone rewrite (polite / neutral / firm)
- Inbound reply parsing with intent detection (paid / promise_to_pay / dispute / unknown)
- Stripe subscription plans (Free / Starter / Pro)

## Quick Start

See [SETUP.md](./SETUP.md) for full setup instructions.

```bash
cp .env.example .env.local
# fill in your keys, then:
npm install
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login & signup pages
│   ├── (dashboard)/     # Protected app pages
│   ├── api/             # Route handlers (cron, AI, Stripe, webhooks)
│   └── page.tsx         # Landing page
├── components/          # Reusable UI components
├── config/              # Plan limits and pricing config
├── lib/                 # Service clients (Supabase, Stripe, Resend, OpenAI)
├── middleware.ts         # Auth guard + session refresh
└── types/               # TypeScript types for DB rows and API payloads
supabase/
└── migrations/          # SQL migration files
```

## Test Checklist

See [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) for 20 manual test cases.
