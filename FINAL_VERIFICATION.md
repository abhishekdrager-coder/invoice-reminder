# Final Verification Checklist

## 1) Install and setup

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed
```

Expected output:
- dependencies install successfully
- migrations/seed complete without SQL errors

Pass criteria:
- all commands exit code 0

Fail criteria:
- migration failure, missing env vars, or npm install errors

## 2) Static quality

```bash
npm run lint
npm run typecheck
```

Expected output:
- no lint violations
- TypeScript noEmit exits cleanly

Pass criteria:
- both commands exit code 0

Fail criteria:
- any lint/type errors

## 3) Tests

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

Expected output:
- unit/integration suites pass
- e2e passes (or explicitly skipped when credentials not configured)

Pass criteria:
- unit and integration green
- e2e green in credentialed environment

Fail criteria:
- failed tests in any required suite

## 4) Security checks

```bash
npm run security:audit
npm run security:secrets-scan
npm run security:headers-check
```

Expected output:
- no high/critical dependency vulnerabilities
- no secret pattern matches
- headers check script reports pass

Pass criteria:
- all commands exit code 0

Fail criteria:
- any vulnerability/security script failure

## 5) Build/start smoke

```bash
npm run build
npm run start
```

Expected output:
- production build completes
- server starts and serves app

Pass criteria:
- app launches without runtime crash

Fail criteria:
- build failure or startup errors

## 6) Final go-live checks

- verify Stripe webhook signature:
  - send known-good signed webhook and confirm 200
  - send invalid signature and confirm 400 invalid_signature
- verify admin route lock:
  - owner/admin can access /admin
  - normal user is denied and redirected
- verify free vs premium gating:
  - free user sees ads and free limits
  - premium user has no ads and premium limits
- verify cron auth token and idempotency:
  - missing/invalid token gets 401
  - repeated trigger does not duplicate sends

Pass criteria:
- all validations match expected behavior

Fail criteria:
- any authz, billing, or idempotency mismatch
