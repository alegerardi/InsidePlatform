# Database Schema

This document distinguishes the current Supabase schema from the approved future payment schema. SQL migrations remain the source of truth for implemented database behavior.

## Implemented core tables

### `profiles`

Stores application profile and role data linked to `auth.users`.

Important rules:

- New profiles default to `client`.
- Valid roles are `client`, `event_organizer`, `event_staff`, and `admin`.
- Users cannot promote their own role.

### `events`

Stores event identity, slug, schedule, status, organizer ownership, and paid/guest-list capacity.

Important rules:

- One organizer can own many events.
- Public event status controls public visibility and ticket availability.
- Event editing is restricted by ownership, role, timing, and capacity already consumed.
- Cancellation is soft cancellation and is allowed only by the applicable server/database rules.

### `ticket_types`

Stores ticket choices for an event, including title, description, price in cents, currency, maximum quantity, active status, sort order, and capacity-pool assignment added by later migrations.

Important rules:

- Active ticket types for public events can be read publicly.
- Organizers can manage ticket types only for events they own and only when editing is allowed.
- Ticket prices are nominal metadata today; online payment collection is not implemented.

### `event_staff_assignments`

Connects staff profiles to events and records who assigned them.

Important rules:

- A staff user can be assigned only once per event.
- Assigned staff may validate only tickets for their assigned events.
- Organizers can manage assignments only for their own events; admins have broader authority.

### `tickets`

Stores an issued ticket, its owner, event, selected ticket type, immutable type/price/currency snapshots, capacity pool, unique ticket code, unique QR token, status, and usage data.

Important rules:

- `unique(event_id, user_id)` enforces one ticket per user per event.
- `ticket_code` and `qr_token` are unique.
- Successful validation atomically changes an active ticket to used.
- Snapshot fields preserve the ticket-type identity and nominal price at issue time.

### `check_ins`

Stores ticket validation attempts, including the ticket and event when known, validator, result, message, and timestamp.

Results include:

- `success`
- `already_used`
- `invalid_ticket`
- `wrong_event`
- `unauthorized`
- `error`

### `event_page_view_stats`

Stores daily raw page-view counters per public event. These are operational counters, not deduplicated visitor analytics.

### `app_action_logs`

Stores security and business-action audit records such as ticket claims and other sensitive operations. Access is restricted; admin-read policy exists at the database level.

## Implemented database operations

Important RPCs and database functions include operations for:

- Atomic event creation with ticket types.
- Event editing with capacity protection.
- Ticket claiming with duplicate and capacity protection.
- Staff assignment and removal.
- Event-specific QR and manual validation.
- Organizer event statistics.
- Public ticket availability.
- Raw event page-view recording.
- Event cancellation only when allowed.

All sensitive operations must continue to use authenticated server-side checks and database enforcement. Application UI checks are supplementary.

## Planned — approved payment schema

Names below are conceptual until an implementation migration is approved. The model must remain payment-provider neutral.

### Event fee configuration

Events require:

- `platform_fee_basis_points`, default `1000`.
- `fee_payer`, either `customer` or `organizer`, default `customer`.
- `fee_configuration_locked_at`.
- A reference to the successful paid order that caused the lock.

Rules:

- Basis points range from `0` to `10000`.
- Amounts round to the nearest cent.
- Admins alone configure these values.
- Values can change only before the first successful paid order.
- Free tickets never lock them.
- A refund or dispute never unlocks them.

### Merchant/payment accounts

A provider-neutral merchant-account table will connect an organizer to a payment provider.

It should store:

- Organizer and provider.
- External provider account reference.
- Onboarding status.
- Payments-enabled and payouts-enabled capabilities.
- Requirements/status summary.
- Timestamps and synchronization state.

Inside Platform must not store raw identity documents or bank credentials.

### Orders

An order represents the commercial purchase independently of any provider attempt.

It must snapshot:

- Client, organizer, event, ticket type, and currency.
- Nominal ticket price in cents.
- Applied fee basis points and fee payer.
- Platform fee in cents.
- Customer total in cents.
- Organizer proceeds in cents.
- Terms version and acceptance evidence.
- Order state and timestamps.

One paid order purchases one ticket. A database constraint must preserve one ticket/order outcome per user per event.

### Inventory reservations

A reservation temporarily holds one unit of ticket and capacity-pool inventory.

It must include:

- Event, ticket type, client, and order.
- Reserved quantity of one.
- Expiration timestamp, normally 15 minutes after creation.
- State such as active, consumed, released, or expired.

Reservation creation and capacity checking must be atomic.

### Payment attempts and payments

Retries must be append-only attempts rather than overwriting history.

Provider-neutral records should store:

- Provider name.
- External checkout/payment references.
- Requested and confirmed amounts and currency.
- Attempt/payment status.
- Idempotency key.
- Provider response summary and timestamps.

Core tables should use names such as `external_payment_id`, not `stripe_payment_intent_id`.

### Organizer transfers and payouts

Transfer records preserve the allocation from a customer payment to an organizer. Payout references record provider-managed payouts when exposed by the provider.

The initial Stripe adapter uses automatic Stripe-managed payouts. Core business logic must not assume that all providers expose identical payout behavior.

### Provider events

Every incoming webhook requires a durable event record containing:

- Provider and unique external event ID.
- Event type.
- Signature-verification result.
- Receipt, processing, and completion timestamps.
- Processing state and error information.
- A protected payload or payload reference appropriate to the retention policy.

`unique(provider, external_event_id)` must make processing idempotent.

### Disputes

Dispute records should preserve the provider dispute reference, payment/order, amount, currency, reason, state, deadlines, evidence status, transfer recovery, and resolution.

### Financial reconciliation

After provider settlement information becomes available, records must capture:

- Actual provider processing cost.
- Platform gross fee.
- Actual platform net.
- Organizer proceeds and transfer state.
- Currency conversion or other provider costs when applicable.

Financial snapshots are immutable facts. Corrections should be append-only adjustments or audit records, not silent rewrites.

## Storage conventions

- Store money as integer minor units, such as euro cents.
- Store percentages as integer basis points.
- Store currency as an ISO currency code; the first paid MVP permits only `EUR`.
- Use UTC timestamps.
- Use explicit database constraints for financial state transitions where practical.
- Keep provider-specific behavior behind an adapter and external-reference fields.
- Never store raw card data.
