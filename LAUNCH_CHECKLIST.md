# Launch Checklist

## Environment and Secrets

- [ ] Production env vars set for Supabase, Stripe, Resend, OpenAI
- [ ] CRON_SECRET and INBOUND_SECRET are strong random values
- [ ] SHOW_ADS explicitly set to true or false
- [ ] Stripe webhook secret configured and verified

## Database

- [ ] All migrations applied through 202607050004_monetization_pricing.sql
- [ ] Seeds applied where needed
- [ ] RLS policies verified in production

## Billing and Limits

- [ ] Stripe prices mapped to premium_lite and premium_pro IDs
- [ ] checkout.session.completed updates subscription plan and status
- [ ] subscription update/delete webhook events correctly sync plan and status
- [ ] Free limits enforced server-side (5 active invoices, 20 reminders/month)
- [ ] Premium Lite limits enforced (30 active invoices, 200 reminders/month)
- [ ] Premium Pro behaves as unlimited

## Automation and Reliability

- [ ] Cron endpoint protected with Bearer CRON_SECRET
- [ ] Reminder sends are idempotent (claim transition in processing path)
- [ ] Retry/backoff behavior confirmed for transient email failures
- [ ] Paid/disputed invoices do not receive future reminders
- [ ] app_logs receiving warning/error events for failures

## Ads and UX

- [ ] Free users see ad slots when SHOW_ADS=true
- [ ] Premium users do not see ad slots
- [ ] Ad impression/click events persist to ad_events

## Admin and Security

- [ ] Non-admin users cannot access /admin routes
- [ ] Admin APIs require admin context
- [ ] Suspended users blocked from protected routes
- [ ] Rate limits active on sensitive endpoints (AI rewrite, inbound, billing checkout, ad events)

## Quality Gates

- [ ] npm run lint
- [ ] npm run typecheck
- [ ] npm run test:unit
- [ ] npm run test:integration
- [ ] npm run test:e2e
- [ ] CI workflow green on main

## Operability

- [ ] Cron scheduler enabled in production
- [ ] Alerting configured on app_logs error spikes
- [ ] Runbook reviewed and on-call owners assigned
