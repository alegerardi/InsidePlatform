# Production Readiness Checklist

This checklist must be reviewed before allowing real public traffic on Inside Platform.

## 1. Deployment Environment

Production hosting must have these environment variables configured:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Rules:

- `NEXT_PUBLIC_SITE_URL` must be the real production domain.
- Do not use `http://localhost:3000` in production.
- Do not add Supabase service-role keys to the frontend environment.
- Do not prefix secret keys with `NEXT_PUBLIC_`.

## 2. Supabase Auth Settings

In Supabase Auth settings, confirm:

- Production site URL is configured.
- Production callback URL is allowed.
- Localhost callback URL is allowed only for development.
- Unknown domains are not allowed as redirect targets.

Expected production callback:

```text
https://your-production-domain.com/auth/callback
```

Local development callback:

```text
http://localhost:3000/auth/callback
```

## 3. GitHub Actions / CI

Before production deployment:

- CI must run on pushes to `main`.
- CI must pass:
  - `npm ci`
  - `npm run lint`
  - `npm run build`
  - `npm run test:integration`

Required GitHub Actions secrets:

```text
TEST_SUPABASE_URL
TEST_SUPABASE_PUBLISHABLE_KEY
TEST_SUPABASE_SERVICE_ROLE_KEY
```

Do not point integration tests at the production database.

## 4. Database / Supabase

Before production:

- All migrations must be applied.
- Supabase generated TypeScript types must be up to date.
- RLS must be enabled on core tables.
- Sensitive mutations must go through database RPCs.
- Staff validation must use the event-specific POST endpoint.
- `/validate/[qrToken]` must not validate tickets through GET.
- PostgREST schema should be reloaded after RPC changes when needed:

```sql
notify pgrst, 'reload schema';
```

## 5. Security Headers

The app should send basic security headers:

- `X-Content-Type-Options`
- `Referrer-Policy`
- `X-Frame-Options`
- `Permissions-Policy`

Camera access must remain available for the staff QR scanner.

## 6. Secrets

Never commit:

```text
.env.local
.env.test.local
```

Never expose:

```text
TEST_SUPABASE_SERVICE_ROLE_KEY
Supabase service_role key
payment provider secret keys
webhook signing secrets
```

Public keys are acceptable only when they are explicitly designed to be public, such as the Supabase publishable/anon key.

## 7. Rate Limiting

Current MVP rate limiting is basic and in-memory.

Currently protected:

- Staff QR scanning
- Ticket claiming
- Public page-view recording

Limitations:

- In-memory limits reset when the server restarts.
- In-memory limits are not shared across multiple server instances.
- This is acceptable for MVP testing, but not enough for high-scale production.

Before larger public traffic, replace or supplement this with Redis, Upstash, database-backed limits, or provider-level protection.

## 8. Ticketing and QR Safety

Before real entrance operations:

- Staff scanner must validate through POST.
- QR codes should contain raw tokens, not state-changing validation URLs.
- Staff must be assigned to the event before validating.
- Double scans must return already-used behavior.
- Wrong-event scans must be blocked.
- Invalid QR tokens must be handled safely.

## 9. Payments

Payments are not implemented yet.

Before selling paid tickets online:

- Add provider-neutral order tables.
- Add payment attempts.
- Add webhook event idempotency.
- Add refund handling.
- Add organizer payment accounts.
- Add ledger entries.
- Add Stripe through a provider adapter.
- Do not make the whole database Stripe-shaped.

## 10. Analytics

Current page views are raw counters.

Known limitations:

- Refreshes can inflate views.
- Bots can inflate views.
- No true visitor deduplication.
- No advanced analytics pipeline.

Do not present raw page views as precise audience analytics.

## 11. Known npm Audit Issues

Do not run:

```bash
npm audit fix --force
```

Reason:

- It may install breaking framework versions.
- It previously suggested downgrading Next.js to an incompatible version.

Current approach:

- Keep Next.js on latest stable.
- Re-run `npm audit` before deployment.
- Apply safe framework updates when available.
- Use overrides only after testing `npm run lint`, `npm run build`, and `npm run test:integration`.

## 12. Manual Browser Smoke Test

Before production deployment, test:

- Login
- Signup
- Auth callback
- Dashboard
- Create event
- Edit upcoming event
- Public event page
- Ticket claim
- Ticket page QR
- Staff validation page
- QR scanner camera permission
- Manual ticket validation
- Event stats
- Staff assignment
- Staff removal
- Event cancellation

## 13. Current Production Status

Current status:

```text
Good for controlled MVP testing.
Not yet ready for unattended large-scale public traffic.
```

Remaining before serious production traffic:

- Add stronger persistent rate limiting.
- Add more integration tests.
- Add monitoring/logging strategy.
- Add production Supabase backup/restore plan.
- Add payment architecture and webhook safety.
- Add admin operational tooling.
