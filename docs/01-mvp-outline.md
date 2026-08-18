# MVP Scope and Product Direction

## Status labels

The documentation uses these labels:

- **Implemented**: available in the current application.
- **Planned — approved design**: agreed product behavior that is not implemented yet.
- **Out of scope**: intentionally excluded from the current phase.

## Product vision

Inside Platform is a lightweight event ticketing, guest-list, and entrance-control platform. Organizers create events and ticket types, clients claim tickets, and assigned staff validate tickets at the entrance using QR codes or manual ticket codes.

The current MVP focuses on controlled event operations. The next approved phase adds provider-neutral online payments with Stripe Connect as the first provider.

## Implemented MVP

### Accounts and authorization

- Supabase signup, login, logout, and auth callback.
- Roles: `client`, `event_organizer`, `event_staff`, and `admin`.
- New users default to `client`.
- A shared role-aware `/dashboard` renders the appropriate module.
- Sensitive operations use server-side authorization and Supabase RLS/RPCs.

### Organizer operations

- Create events atomically with ticket types.
- View upcoming, ongoing, and past events.
- Edit upcoming events and ticket capacity.
- Publish public event pages at `/events/[slug]`.
- Assign and remove event staff.
- Cancel events that have no revenue.
- View capacity, ticket mix, entrance, check-in, and raw page-view statistics.

### Tickets and capacity

- Paid and guest-list capacity pools exist as ticket categories.
- Ticket types can have prices and capacity limits.
- Ticket claiming currently creates tickets without online payment, including ticket types with a nominal price.
- One user can hold only one ticket per event.
- Each ticket has a unique human-readable code and QR token.
- Clients can view their tickets and QR codes.

The current use of `paid` describes a capacity pool; it does not mean that payment collection is implemented.

### Entrance validation

- Assigned staff select an event and open `/staff/events/[eventId]/validate`.
- Camera QR scanning and manual ticket-code validation are supported.
- State-changing validation uses the event-specific POST route `/staff/events/[eventId]/scan`.
- Validation is server-side, event-scoped, assignment-aware, and atomic.
- Every validation attempt is recorded in `check_ins` when possible.
- `/validate/[qrToken]` is a safe legacy page and never validates through GET.

### Engineering and security

- Generated Supabase TypeScript database types.
- Integration tests for important database and authorization rules.
- GitHub Actions CI for lint, build, and integration tests.
- Basic security headers.
- In-memory rate limiting for ticket claims, staff scans, and page views.
- Audit records in `app_action_logs`.

## Planned — approved payment design

- The organizer is the ticket seller; Inside Platform is an intermediary.
- The payment domain is provider-neutral; Stripe Connect is the first adapter.
- Organizer onboarding uses provider-hosted identity and bank verification.
- Paid ticket types require an organizer account with payments and payouts enabled.
- The initial currency is EUR.
- One paid order purchases one ticket for the authenticated client.
- Checkout uses a 15-minute atomic capacity reservation.
- A verified, idempotently processed provider webhook is the source of payment truth.
- A usable ticket is issued only after successful payment confirmation.
- Default platform fee is 10%, stored as `1000` basis points.
- Default fee payer is the customer.
- Admins may configure the fee and payer per event before the first successful paid order.
- The first successful paid order permanently locks the event fee configuration.
- Free tickets bypass payment, fees, reservations, and fee locking.
- Provider processing costs are absorbed from Inside Platform's retained fee.
- Organizer payouts use the provider's automatic payout schedule.
- An event with a successful paid order cannot be cancelled through the normal organizer flow.

See `06-payments-and-fees.md` and `07-payment-lifecycle.md` for the approved design.

## Out of scope

- Customer-initiated refunds and partial refunds.
- Stripe Tax or automated VAT calculation and remittance.
- Multiple tickets per purchaser per event.
- Ticket transfers and named attendee management.
- Currencies other than EUR.
- Organization-level accounts.
- Promoter tracking.
- Email automation.
- Advanced analytics.
- Production-scale distributed rate limiting.
- Full admin operations and role-management tooling.

## Current readiness

The implemented application is suitable for controlled MVP testing. It is not ready to collect real paid ticket revenue until the approved payment schema, provider integration, webhook processing, evidence retention, legal terms, monitoring, and production controls are implemented and verified.
