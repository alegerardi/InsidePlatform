# Inside Platform

Inside Platform is a Next.js and Supabase event ticketing, guest-list, and entrance-control platform.

The implemented MVP supports event creation, public event pages, ticket types and capacity pools, free ticket claiming, QR tickets, staff validation, event operations, and organizer statistics. Online payment collection is the next approved phase and is not implemented yet.

## Status

Documentation uses three labels:

- **Implemented**: available in the current application.
- **Planned — approved design**: agreed behavior that still requires implementation.
- **Out of scope**: intentionally excluded from the current phase.

The current application is appropriate for controlled MVP testing. It is not ready to collect real paid ticket revenue.

## Implemented

- Supabase authentication.
- Roles: `client`, `event_organizer`, `event_staff`, and `admin`.
- Shared role-aware dashboard.
- Public event pages by slug.
- Atomic event creation with ticket types.
- Paid and guest-list capacity pools.
- Upcoming-event editing and no-revenue cancellation.
- One ticket per user per event.
- Unique ticket code and QR token.
- Camera QR scanning and manual ticket-code validation.
- Event-specific, POST-only, server-side validation.
- Staff assignment and removal.
- Organizer capacity, ticket, entrance, check-in, and raw page-view statistics.
- Audit logs, generated Supabase types, security integration tests, and CI.
- Basic security headers and in-memory rate limits.

Ticket types can currently have a nominal price and use the `paid` capacity pool, but claiming does not collect money. Do not treat the current flow as paid commerce.

## Planned — approved payment phase

- Organizer is the ticket seller; Inside Platform is an intermediary.
- Provider-neutral payment domain with Stripe Connect as the first adapter.
- Provider-hosted organizer onboarding and automatic payouts.
- EUR-only paid tickets, one ticket per client per event.
- Fifteen-minute atomic inventory reservations.
- Verified, idempotent webhook confirmation before ticket issuance.
- Default platform fee of 10% (`1000` basis points).
- Default fee payer is the customer.
- Admin-controlled per-event fee configuration, permanently locked by the first successful paid order.
- Free tickets bypass payment and fee locking.
- No customer refund or partial-refund interface in the first paid MVP.
- Dispute recording, organizer-value recovery, reconciliation, and evidence retention.

See [payments and fees](docs/06-payments-and-fees.md) and [payment lifecycle](docs/07-payment-lifecycle.md).

## Out of scope

- Stripe Tax and automated VAT handling.
- Multiple-ticket purchases and ticket transfers.
- Currencies other than EUR.
- Organization-level accounts.
- Promoter tracking.
- Email automation.
- Advanced analytics.
- Production-scale distributed rate limiting and complete admin operations.

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth and Postgres
- Supabase Row Level Security and RPC functions
- Vitest
- GitHub Actions

## Main routes

Public:

- `/`
- `/login`
- `/signup`
- `/events/[slug]`

Authenticated:

- `/dashboard`
- `/events/new`
- `/events/[slug]/edit`
- `/events/[slug]/stats`
- `/tickets/[ticketId]`
- `/staff/events/[eventId]/validate`

Internal/state-changing:

- `/auth/callback`
- POST `/staff/events/[eventId]/scan`

Safe legacy route:

- `/validate/[qrToken]`

Opening the legacy route never validates a ticket. Real validation occurs only through the assigned staff event flow.

## Project structure

```text
app/                 routes and server-rendered pages
components/          UI modules and forms
lib/actions/         authenticated server actions
lib/auth/            authentication and profile helpers
lib/events/          event queries and statistics
lib/staff/           staff queries
lib/supabase/        Supabase clients and generated types
lib/tickets/         ticket queries
supabase/migrations/ implemented database history
tests/integration/   Supabase security and business-rule tests
docs/                product, flow, schema, and readiness documentation
```

## Local development

Required environment values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Commands:

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run test:integration
```

Integration tests require the dedicated test Supabase variables described in `docs/production-readiness-checklist.md`. Never point integration tests at production and never expose a Supabase service-role key to browser code.

## Documentation

- `docs/01-mvp-outline.md`: implemented scope, approved next phase, and exclusions.
- `docs/02-database-schema.md`: current schema and proposed provider-neutral payment domain.
- `docs/03-auth-and-roles.md`: current roles and planned payment permissions.
- `docs/04-ticket-flow.md`: implemented claims and approved paid-ticket flow.
- `docs/05-qr-validation-flow.md`: current entrance-validation architecture.
- `docs/06-payments-and-fees.md`: approved commercial and fee specification.
- `docs/07-payment-lifecycle.md`: approved order, reservation, webhook, and dispute lifecycle.
- `docs/production-readiness-checklist.md`: launch controls and remaining work.
