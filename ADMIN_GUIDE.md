# Admin Guide

## Access Model

- Admin pages are under /admin
- Access requires profiles.role = admin
- RBAC is enforced in middleware and server guards

## Admin Pages

## 1) Overview

Path: /admin/overview

Primary KPIs:
- total users
- new users 7d
- active users 7d
- activation rate
- total invoices
- outstanding amount
- overdue amount
- recovered 30d
- recovery rate 30d
- reminders sent 30d
- reminder failure rate 30d
- MRR
- free to paid conversion
- churn 30d

## 2) Users

Path: /admin/users

Capabilities:
- search by email
- suspend/reactivate users

## 3) Invoices

Path: /admin/invoices

Capabilities:
- global read-only invoice inspection

## 4) Reminders

Path: /admin/reminders

Capabilities:
- inspect sent/failed reminders
- retry failed reminders

## 5) Billing

Path: /admin/billing

Capabilities:
- active subscriptions by plan
- MRR estimate
- conversion and churn views
- subscription status table

## 6) Logs

Path: /admin/logs

Capabilities:
- inspect app warning/error events
- troubleshoot webhook/cron failures

## Operational Tips

- If reminders fail, inspect /admin/logs first, then /admin/reminders
- If billing mismatches, verify Stripe webhook delivery and subscription rows
- If a user reports blocked access, verify suspended flag and role

## Safety Rules

- Do not grant admin role broadly
- Suspend compromised users immediately
- Use least-privilege access for support staff
