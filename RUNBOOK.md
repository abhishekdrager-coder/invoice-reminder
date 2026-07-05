# Invoice Copilot Runbook

## Service Overview

- Web app: Next.js server
- DB/Auth: Supabase
- Billing: Stripe webhooks and checkout
- Email: Resend
- AI rewrite: OpenAI
- Automation: /api/cron/send-reminders

## Common Failures and Recovery

## 1) Cron returns 401 unauthorized

Symptoms:
- Scheduler calls fail with 401

Checks:
- Confirm Authorization header is exactly Bearer <CRON_SECRET>
- Confirm CRON_SECRET in runtime matches scheduler secret

Recovery:
- Rotate CRON_SECRET and update scheduler
- Re-run cron endpoint manually

## 2) Stripe webhook signature invalid

Symptoms:
- /api/stripe/webhook returns 400 Invalid signature
- Billing state does not update

Checks:
- STRIPE_WEBHOOK_SECRET matches Stripe endpoint secret
- Raw body delivery is intact
- Event type subscriptions include required events

Recovery:
- Correct secret and replay recent events from Stripe dashboard
- Verify subscriptions rows updated

## 3) Reminder send failures spike

Symptoms:
- Many reminders in failed state
- app_logs contains cron.send_reminders errors

Checks:
- Resend API status and credentials
- EMAIL_FROM sender verification
- OpenAI availability if rewrite step fails

Recovery:
- Fix provider credentials or outage conditions
- Use admin reminders retry action for failed rows
- Temporarily lower cron frequency while backlogs clear

## 4) Free users bypass limits

Symptoms:
- More than allowed unpaid invoices or monthly reminders sent

Checks:
- Confirm subscription plan rows are correct
- Verify migration 202607050004 applied
- Verify quota checks in invoice and cron routes

Recovery:
- Correct subscription rows for affected users
- Replay blocked logic via API checks
- Add temporary manual cap review query in admin

## 5) Admin access issues

Symptoms:
- Admin cannot reach /admin pages or non-admin can access

Checks:
- profiles.role is admin for target user
- middleware and server guards deployed from current release

Recovery:
- Run ADMIN_BOOTSTRAP_EMAIL script for admin setup
- Revoke unintended admin roles in profiles table

## Operational Commands

Run checks:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
```

Run cron manually:

```bash
curl -X POST http://localhost:3000/api/cron/send-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Escalation

- Billing incident: check Stripe webhook logs first
- Reminder incident: check app_logs where context = cron.send_reminders
- Security incident: rotate CRON_SECRET, INBOUND_SECRET, Stripe webhook secret, and API keys
