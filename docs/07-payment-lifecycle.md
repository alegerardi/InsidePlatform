# Payment Lifecycle

**Status: Planned — approved design.**

## Principles

- The browser is not a source of payment truth.
- A verified provider webhook confirms payment.
- Webhook processing is durable, idempotent, and retryable.
- Capacity reservation and ticket issuance are atomic database operations.
- One client can obtain only one ticket per event.
- Payment retries append attempts; they never overwrite history.
- Provider-specific behavior remains behind an adapter.

## Order states

```text
pending
processing
paid
failed
expired
disputed
```

An implementation may use additional internal states only if transitions and recovery behavior are documented before coding.

## Reservation states

```text
active
consumed
released
expired
```

An active reservation holds one unit for 15 minutes across event capacity, capacity pool, and ticket-type capacity.

## Payment-attempt states

At minimum:

```text
created
requires_customer_action
processing
succeeded
failed
expired
```

Provider statuses are mapped into these neutral states while raw/external status remains available for reconciliation.

## Standard success sequence

1. Authenticated client selects one paid ticket type.
2. Server checks event, user uniqueness, organizer capability, price, and capacity.
3. Database atomically creates a pending order and 15-minute active reservation.
4. Server creates a payment attempt with an idempotency key.
5. Provider adapter creates checkout for the snapshotted customer total and organizer destination.
6. Client completes provider checkout.
7. Provider sends a signed payment event.
8. Webhook handler verifies and durably records the event.
9. Processor verifies provider payment, amount, EUR currency, organizer destination, and expected order.
10. One database transaction marks payment/order paid, consumes the reservation, creates one ticket, and locks event fees if needed.
11. Repeated delivery returns the already-processed outcome.

## Browser return

The success/return page may display `processing` while the webhook is pending. It reads server state and never performs payment confirmation or ticket issuance.

## Failure and expiration

- Checkout failure marks the attempt failed.
- A failed attempt does not issue a ticket or lock fees.
- An abandoned order expires when its reservation expires.
- Expiration releases inventory atomically.
- A retry creates a new payment-attempt record.
- Only one attempt may ultimately settle an order successfully.

## Late payment after reservation expiry

This case must not be ignored because provider events can arrive late.

Approved safe behavior:

1. Recheck the provider payment and local order idempotently.
2. Attempt an atomic capacity allocation.
3. If capacity and user uniqueness are still available, complete the order and issue the ticket.
4. If fulfillment is impossible, flag the payment for immediate admin exception handling and block automatic ticket issuance.
5. Never oversell or silently mark an unfulfillable order paid-and-complete.

Because the first MVP lacks application refunds, this exception requires an admin-managed provider process and audit record.

## Free-ticket interaction

- Free ticket types use direct atomic claim and issuance.
- They create no payment order or reservation.
- They do not lock fee settings.
- Existing free tickets block a later paid ticket for the same user/event.
- An active or paid order blocks a competing free claim for the same user/event.

## Fee locking transaction

The same transaction that completes the first paid order must set:

```text
fee_configuration_locked_at
fee_configuration_locked_by_order_id
```

The transaction uses the order's immutable fee snapshot and must fail if an unauthorized configuration mutation races with payment completion.

## Provider webhook processing

Every webhook must:

- Verify its signature against the provider-specific secret.
- Be persisted before or as part of processing.
- Be unique by provider and external event ID.
- Return success for already-completed duplicate delivery.
- Separate transient failures from permanent invalid events.
- Avoid logging secrets, full sensitive payloads, or QR tokens unnecessarily.
- Support controlled replay of failed processing.

The webhook endpoint must acknowledge provider events according to provider timing requirements while preserving reliable asynchronous processing where needed.

## Reconciliation

Reconciliation compares local payments with provider state and records:

- Confirmed gross amount and currency.
- Actual provider fees.
- Organizer transfer amount and state.
- Provider-managed payout reference/status when available.
- Platform gross fee and actual net.
- Missing, duplicated, or mismatched records.

Reconciliation can repair synchronization state but cannot silently change immutable commercial snapshots.

## Dispute sequence

1. Provider dispute event is verified and recorded.
2. Payment/order is associated with a dispute record.
3. Order becomes `disputed` without deleting prior paid history.
4. If the ticket is unused, it is invalidated.
5. If used, check-in history remains unchanged.
6. Inside Platform gathers retained order, terms, payment, event, and ticket evidence.
7. Organizer transfer value may be reversed or recovered.
8. Provider outcome and financial adjustments are appended.

Inside Platform initially absorbs the provider dispute fee; the organizer remains responsible for the disputed ticket value.

## Event cancellation guard

Normal cancellation must fail when any successful paid order exists. An exceptional admin workflow must record actor, reason, affected orders/tickets/transfers, provider actions, evidence, and timestamps.

## Required tests

- Concurrent attempts for the last capacity unit.
- Free claim racing a paid reservation.
- Duplicate checkout creation request.
- Duplicate and out-of-order provider events.
- Successful payment and atomic single-ticket issuance.
- Webhook success after reservation expiry with and without capacity.
- Amount, currency, destination, and provider-reference mismatch.
- Fee edit racing the first successful payment.
- Failed attempt and retry.
- Paid-event cancellation rejection.
- Dispute invalidation of unused ticket.
- Dispute preservation of used check-in history.
