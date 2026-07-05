# Security Runbook

## Incident Response Checklist

1. Identify affected scope:
- auth
- billing/webhooks
- admin access
- cron/inbound endpoints

2. Contain quickly:
- rotate exposed secrets (Stripe, Supabase, OpenAI, Resend, CRON_SECRET, INBOUND_SECRET)
- disable ALLOWLIST_MODE=false to true if private lockdown is needed
- suspend impacted accounts via admin tools

3. Investigate:
- review app_logs by context and timestamp
- review stripe_webhook_events for replay/anomaly patterns
- verify profile role changes and admin actions

4. Recover:
- patch vulnerability and deploy
- replay valid Stripe events if required
- retry failed reminder jobs via admin panel

5. Post-incident:
- document timeline, root cause, and corrective actions
- add regression tests and tighten detection rules

## Backup and Restore Basics

## Backup cadence

- Daily full PostgreSQL backups
- Hourly WAL/incremental backups (or Supabase PITR)
- Retain backups according to compliance policy

## Restore drill

1. Restore latest backup to staging clone
2. Run migration status checks
3. Verify auth, billing, and reminder workflows
4. Validate admin and RLS behavior
5. Sign off and document RTO/RPO

## Recommended Security Monitoring

- Alert on spikes in:
  - failed logins
  - webhook signature failures
  - webhook replay events
  - checkout rate-limit events
  - admin role update events
