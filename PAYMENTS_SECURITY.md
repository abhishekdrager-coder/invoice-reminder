# Payments Security Architecture

## Processor and Scope

- Stripe is the only payment processor.
- Hosted Checkout is used for subscription purchases.
- Stripe Customer Portal is used for self-service billing management.
- Card data is never handled or stored by this app.

## Security Controls

## 1) Server-only Stripe secrets

- STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are server-only.
- Plan price IDs are read from server env vars.
- Client never sends trusted entitlements.

## 2) Webhook authenticity and replay protection

- Stripe-Signature is verified using endpoint secret and tolerance window.
- Invalid/unsigned events are rejected.
- Event allowlist enforces accepted types only:
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.paid
  - invoice.payment_failed
- Processed webhook IDs are reserved in stripe_webhook_events to prevent replay.

## 3) Billing integrity

- Subscription state in DB is updated only from verified webhooks.
- Plan entitlements are derived server-side from DB state.
- Unsupported or forged client plan values are rejected.

## 4) Abuse mitigation

- Checkout endpoint uses route-specific rate limiting.
- Optional billing challenge can be enabled for repeated attempts.
- Suspicious activity is written to app_logs for admin review.

## 5) Operational resilience

- Webhook failures are logged with structured context.
- Replay and invalid signature attempts are logged.
- Admin logs dashboard surfaces billing issues for triage.

## Environment Variables

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PREMIUM_LITE_PRICE_ID
- STRIPE_PREMIUM_PRO_PRICE_ID
- STRIPE_WEBHOOK_TOLERANCE_SECONDS
- BILLING_CHALLENGE_ENABLED
- BILLING_CHALLENGE_THRESHOLD
- BILLING_CHALLENGE_TOKEN
