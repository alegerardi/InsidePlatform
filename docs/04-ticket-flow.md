# Ticket Flow

## Shared business rules

- A logged-in user can hold only one ticket per event.
- The database enforces `unique(event_id, user_id)`.
- Each ticket has a unique `ticket_code` and `qr_token`.
- Capacity is enforced server-side and atomically in the database.
- A browser never decides ticket eligibility or payment success.

## Implemented ticket flow

The current application does not collect online payments. Ticket types may have a nominal price and belong to `paid` or `guest_list` capacity pools, but claiming currently issues a ticket without payment.

Current flow:

1. A user opens `/events/[slug]` and selects an available ticket type.
2. An unauthenticated user is redirected to login/signup with a sanitized return path.
3. The server verifies the user, event status, ticket type, capacity pool, and availability.
4. If the user already has a ticket for the event, the existing ticket is returned.
5. Otherwise, the database atomically creates a ticket with secure unique codes.
6. The user is redirected to `/tickets/[ticketId]` and can also see the ticket on `/dashboard`.

Allowed event statuses for claiming are `published` and `active`. Draft, completed, and cancelled events do not issue tickets.

## Implemented capacity model

Each event has separate paid and guest-list capacity. Ticket types consume one configured capacity pool and can also have a type-level maximum.

Availability must account for active and used tickets. Public availability is informational; the database operation remains authoritative under concurrency.

## Planned — free-ticket flow after payments

Free ticket types keep a direct claim flow:

1. Authenticate the client.
2. Verify the event and ticket type are available.
3. Atomically enforce event, pool, type, and one-user-per-event capacity.
4. Create the ticket immediately.

Free claims:

- Do not create an order or provider payment.
- Do not charge a platform fee.
- Do not create a temporary payment reservation.
- Do not lock event fee configuration.
- Still prevent the user from later purchasing another ticket for the same event.

## Planned — paid-ticket flow

One authenticated client purchases exactly one ticket for themselves.

### Checkout preparation

1. Verify the client has no ticket or active/paid order for the event.
2. Verify the event is public, has not started, and permits paid sales.
3. Verify the selected ticket type has a positive EUR price.
4. Verify the organizer's merchant account has payments and payouts enabled.
5. Read the event fee configuration.
6. Calculate monetary values in integer cents using basis points and nearest-cent rounding.
7. Atomically create an order and reserve one unit of event, pool, and ticket-type capacity for 15 minutes.
8. Create a provider payment attempt and checkout session outside the database transaction.
9. Save the provider-neutral external references.
10. Redirect the client to provider-hosted checkout.

If checkout creation fails, mark the attempt failed and release or expire the reservation safely.

### Fee calculation

For nominal price `P` cents and `B` basis points:

```text
platform fee = round_to_nearest_cent(P × B / 10000)
```

Customer-paid mode:

```text
customer total = nominal price + platform fee
organizer proceeds = nominal price
```

Organizer-paid mode:

```text
customer total = nominal price
organizer proceeds = nominal price - platform fee
```

Inside Platform's final net is its gross platform fee minus actual provider processing and applicable provider costs. The platform absorbs this variation.

### Payment confirmation

The checkout return page is informational and may poll or fetch order status. It never marks an order paid.

A verified provider webhook must:

1. Be stored and deduplicated by provider event ID.
2. Locate the payment attempt and order.
3. Verify amount, currency, merchant destination, and expected state.
4. Atomically mark the payment and order paid.
5. Consume the active reservation.
6. Create exactly one usable ticket with immutable snapshots.
7. Lock the event fee configuration if this is its first successful paid order.
8. Record audit evidence.

Repeated events must return the existing result without issuing another ticket.

### Failed and abandoned checkout

Initial order states are:

```text
pending
processing
paid
failed
expired
disputed
```

- Failed attempts never issue tickets or lock fees.
- An unpaid reservation expires after 15 minutes and releases capacity.
- A late provider success must be handled explicitly and never oversell silently.
- Payment retries are new attempt records; history is never overwritten.

See `07-payment-lifecycle.md` for state transitions and late-event behavior.

## Fee and price locking

- Event fee defaults to `1000` basis points (10%).
- Fee payer defaults to `customer`.
- Admins may change either value before the first successful paid order.
- The first successful paid order locks both values for the entire event.
- Free tickets, failed payments, and expired orders do not lock them.
- Refunds and disputes do not unlock them.
- A ticket type's price locks after its first successful paid purchase.
- A sold type may be deactivated but not financially rewritten.
- New types may be added before the event starts if capacity remains and must use the locked event fee policy.

## Event cancellation

- Events with no successful paid orders may use the current cancellation rules.
- An event with any successful paid order cannot be cancelled through the organizer interface.
- Cancellation then requires an exceptional admin-managed process with audit evidence.
- The first paid MVP has no customer refund or partial-refund interface.

## Ticket display

Tickets show event, date, location, ticket type, nominal price/currency snapshot, ticket code, QR code, and status. Paid-order financial details belong to the order/receipt view and must not be inferred from mutable ticket-type data.

## Out of scope for the first paid MVP

- Multiple tickets in one order.
- Buying for another attendee.
- Ticket transfers.
- Customer-requested refunds and partial refunds.
- Currencies other than EUR.
- VAT calculation or Stripe Tax.
