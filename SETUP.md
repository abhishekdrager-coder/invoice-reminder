# Invoice Copilot Setup

## 1. Local development
1. Copy `.env.example` to `.env.local`.
2. Install dependencies with `npm install`.
3. Start the app with `npm run dev`.
4. Open `http://localhost:3000`.

## 2. Supabase setup
1. Create a new Supabase project.
2. In **Project Settings → API**, copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. In the SQL editor, run the SQL from:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_reminder_sequence.sql`
4. In **Authentication → Providers**, enable Email + Password and Google.
5. Add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-vercel-domain/auth/callback`
6. Exact CLI alternative:
   ```bash
   supabase db push
   ```

## 3. Stripe setup
1. Create products for **Starter** and **Pro** in Stripe.
2. Copy the recurring price IDs into:
   - `STRIPE_STARTER_PRICE_ID`
   - `STRIPE_PRO_PRICE_ID`
3. Set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. Add a webhook endpoint:
   - Local: `http://localhost:3000/api/webhooks/stripe`
   - Production: `https://your-vercel-domain/api/webhooks/stripe`
5. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Save the signing secret as `STRIPE_WEBHOOK_SECRET`.

## 4. Resend setup
1. Create a Resend account and verify your sending domain.
2. Set `RESEND_API_KEY`.
3. Update the sender in `src/lib/resend.ts` if you want a different from-address.
4. Point inbound email/webhook processing to `POST /api/webhooks/email`.

## 5. OpenAI setup
1. Create an API key and set `OPENAI_API_KEY`.
2. The AI rewrite endpoint is `POST /api/ai/rewrite`.
3. Rate limiting is enforced at 10 rewrite requests per minute per user.

## 6. Cron job setup
1. Set a strong `CRON_SECRET` value.
2. Configure a Vercel cron or external scheduler to call:
   - `GET /api/cron/send-reminders`
3. Send the header `x-cron-secret: YOUR_SECRET`.

## 7. Vercel deployment
1. Import the repository into Vercel.
2. Add every variable from `.env.example`.
3. Set the production URL in `NEXT_PUBLIC_APP_URL`.
4. Deploy.

## 8. Environment variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_FREE_PRICE_ID=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
RESEND_API_KEY=
OPENAI_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
