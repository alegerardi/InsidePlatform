# Provider-Neutral Payment Schema Proposal

**Status: Phase 2 design proposal — not implemented.**

This document defines the exact target schema for review before any payment migration is created. Existing migrations remain the source of truth for the current application.

## Design goals

- Organizer is the ticket seller; Inside Platform is the intermediary.
- Stripe Connect is the first provider but is isolated behind external references.
- Money uses integer minor units; the first release permits only EUR.
- Percentages use integer basis points.
- Orders preserve immutable commercial snapshots.
- Provider webhooks are durable and idempotent.
- Capacity, payment fulfillment, ticket issuance, and fee locking are concurrency-safe.
- Free tickets continue to work without payment records.
- Financial history is append-only and auditable.

## Naming decisions

- Use `payment_orders`, not `orders`, to avoid ambiguity and reserved-word friction.
- Use `external_*_id` for provider identifiers; never put `stripe_*` fields in core tables.
- Store `provider` as normalized non-empty text rather than an enum. Adding another provider must not require changing a database enum.
- Use internal enums for stable Inside Platform states.
- Use `client_user_id` for the purchaser and `organizer_user_id` for the seller.

## New internal enums

```sql
create type public.fee_payer as enum (
  'customer',
  'organizer'
);

create type public.merchant_account_status as enum (
  'not_started',
  'pending',
  'restricted',
  'enabled',
  'disabled'
);

create type public.payment_order_status as enum (
  'pending',
  'processing',
  'paid',
  'failed',
  'expired',
  'disputed'
);

create type public.inventory_reservation_status as enum (
  'active',
  'consumed',
  'released',
  'expired'
);

create type public.payment_attempt_status as enum (
  'created',
  'requires_customer_action',
  'processing',
  'succeeded',
  'failed',
  'expired'
);

create type public.payment_status as enum (
  'processing',
  'succeeded',
  'failed',
  'refunded',
  'partially_refunded',
  'disputed'
);

create type public.organizer_transfer_status as enum (
  'pending',
  'succeeded',
  'failed',
  'partially_reversed',
  'reversed'
);

create type public.provider_payout_status as enum (
  'pending',
  'in_transit',
  'paid',
  'failed',
  'cancelled',
  'unknown'
);

create type public.provider_event_status as enum (
  'received',
  'processing',
  'processed',
  'ignored',
  'failed'
);

create type public.payment_dispute_status as enum (
  'warning',
  'needs_response',
  'under_review',
  'won',
  'lost',
  'closed'
);

create type public.financial_adjustment_type as enum (
  'provider_fee',
  'provider_fee_correction',
  'transfer_reversal',
  'dispute_fee',
  'dispute_recovery',
  'refund',
  'other'
);

create type public.terms_document_type as enum (
  'customer_purchase_terms',
  'privacy_notice',
  'refund_policy',
  'event_cancellation_policy'
);
```

Refund states exist so externally initiated provider events can be represented even though the MVP has no refund UI.

## Changes to existing tables

### `events`

Add:

```sql
alter table public.events
  add column platform_fee_basis_points integer not null default 1000,
  add column fee_payer public.fee_payer not null default 'customer',
  add column fee_configuration_locked_at timestamptz,
  add column fee_configuration_locked_by_order_id uuid;

alter table public.events
  add constraint events_platform_fee_basis_points_range
  check (platform_fee_basis_points between 0 and 10000);

alter table public.events
  add constraint events_fee_lock_pair
  check (
    (fee_configuration_locked_at is null and fee_configuration_locked_by_order_id is null)
    or
    (fee_configuration_locked_at is not null and fee_configuration_locked_by_order_id is not null)
  );
```

The order foreign key is added after `payment_orders` exists:

```sql
alter table public.events
  add constraint events_fee_lock_order_fk
  foreign key (fee_configuration_locked_by_order_id)
  references public.payment_orders(id)
  on delete restrict;
```

Indexes:

```sql
create index events_fee_configuration_locked_idx
  on public.events(fee_configuration_locked_at)
  where fee_configuration_locked_at is not null;
```

Rules not expressible as a check constraint:

- Only admin RPC logic may change fee fields.
- Locked fee fields are immutable.
- The locking order must belong to the same event and be successfully paid.
- Locking occurs in the same transaction as first paid fulfillment.

### `ticket_types`

Add:

```sql
alter table public.ticket_types
  add column price_locked_at timestamptz,
  add column price_locked_by_order_id uuid;

alter table public.ticket_types
  add constraint ticket_types_price_lock_pair
  check (
    (price_locked_at is null and price_locked_by_order_id is null)
    or
    (price_locked_at is not null and price_locked_by_order_id is not null)
  );
```

Add the order foreign key after `payment_orders` exists. A trigger or guarded update RPC must reject changes to `price_cents`, `currency`, and `capacity_pool` after price locking. Title and description may remain editable only if product policy permits; order and ticket snapshots remain authoritative.

The first paid MVP requires positive-price ticket types to use `currency = 'EUR'`. A zero-price ticket type follows the free claim flow regardless of capacity pool.

### `tickets`

Add:

```sql
alter table public.tickets
  add column payment_order_id uuid unique
  references public.payment_orders(id) on delete restrict;
```

Rules:

- Free tickets have `payment_order_id is null`.
- Paid tickets require a paid order for the same event, client, and ticket type.
- Exactly one ticket may fulfill an order.
- Existing `unique(event_id, user_id)` continues to enforce one ticket per user per event.
- A disputed unused ticket changes to `invalid`; used check-in history remains unchanged.

## New tables

### `payment_merchant_accounts`

One organizer can have one merchant account per provider.

```sql
create table public.payment_merchant_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  organizer_user_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null,
  external_account_id text not null,
  status public.merchant_account_status not null default 'not_started',
  onboarding_completed_at timestamptz,
  payments_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  requirements_due jsonb not null default '[]'::jsonb,
  provider_status text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_merchant_accounts_provider_not_blank
    check (length(trim(provider)) > 0),
  constraint payment_merchant_accounts_external_id_not_blank
    check (length(trim(external_account_id)) > 0),
  constraint payment_merchant_accounts_unique_organizer_provider
    unique (organizer_user_id, provider),
  constraint payment_merchant_accounts_unique_external_account
    unique (provider, external_account_id)
);
```

Indexes:

```sql
create index payment_merchant_accounts_enabled_idx
  on public.payment_merchant_accounts(organizer_user_id)
  where payments_enabled and payouts_enabled;
```

`requirements_due` stores status codes only, never identity documents, bank data, or secrets.

### `legal_terms_versions`

Stores immutable versions of customer-facing legal documents.

```sql
create table public.legal_terms_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  document_type public.terms_document_type not null,
  version text not null,
  content_hash text not null,
  public_url text not null,
  effective_at timestamptz not null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),

  constraint legal_terms_versions_version_not_blank
    check (length(trim(version)) > 0),
  constraint legal_terms_versions_hash_not_blank
    check (length(trim(content_hash)) > 0),
  constraint legal_terms_versions_unique_document_version
    unique (document_type, version),
  constraint legal_terms_versions_valid_window
    check (retired_at is null or retired_at > effective_at)
);
```

The actual document content lives in version-controlled/public document storage; the database preserves its version, URL, and cryptographic hash.

### `payment_orders`

The order is the immutable commercial snapshot and is independent from provider attempts.

```sql
create table public.payment_orders (
  id uuid primary key default extensions.gen_random_uuid(),
  client_user_id uuid not null references public.profiles(id) on delete restrict,
  organizer_user_id uuid not null references public.profiles(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  merchant_account_id uuid not null references public.payment_merchant_accounts(id) on delete restrict,

  status public.payment_order_status not null default 'pending',
  currency text not null default 'EUR',
  ticket_price_cents integer not null,
  platform_fee_basis_points integer not null,
  fee_payer public.fee_payer not null,
  platform_fee_cents integer not null,
  customer_total_cents integer not null,
  organizer_proceeds_cents integer not null,

  event_title_snapshot text not null,
  ticket_type_title_snapshot text not null,
  organizer_display_name_snapshot text not null,
  customer_email_snapshot text not null,

  terms_accepted_at timestamptz not null,
  acceptance_ip_hash text,
  acceptance_user_agent text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  failed_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_orders_eur_only check (currency = 'EUR'),
  constraint payment_orders_positive_ticket_price check (ticket_price_cents > 0),
  constraint payment_orders_fee_basis_points_range
    check (platform_fee_basis_points between 0 and 10000),
  constraint payment_orders_nonnegative_amounts check (
    platform_fee_cents >= 0
    and customer_total_cents >= 0
    and organizer_proceeds_cents >= 0
  ),
  constraint payment_orders_customer_total_formula check (
    customer_total_cents = ticket_price_cents
      + case when fee_payer = 'customer' then platform_fee_cents else 0 end
  ),
  constraint payment_orders_organizer_proceeds_formula check (
    organizer_proceeds_cents = ticket_price_cents
      - case when fee_payer = 'organizer' then platform_fee_cents else 0 end
  ),
  constraint payment_orders_expiry_after_creation check (expires_at > created_at),
  constraint payment_orders_paid_timestamp check (
    (status in ('paid', 'disputed') and paid_at is not null)
    or
    (status not in ('paid', 'disputed') and paid_at is null)
  )
);
```

Fee calculation itself is verified in the order-creation RPC using integer half-up rounding:

```sql
platform_fee_cents :=
  ((ticket_price_cents::bigint * platform_fee_basis_points::bigint) + 5000)
    / 10000;
```

Indexes:

```sql
create index payment_orders_client_created_idx
  on public.payment_orders(client_user_id, created_at desc);

create index payment_orders_event_created_idx
  on public.payment_orders(event_id, created_at desc);

create index payment_orders_organizer_created_idx
  on public.payment_orders(organizer_user_id, created_at desc);

create index payment_orders_status_expiry_idx
  on public.payment_orders(status, expires_at);

create unique index payment_orders_one_live_order_per_client_event
  on public.payment_orders(event_id, client_user_id)
  where status in ('pending', 'processing', 'paid', 'disputed');
```

Cross-table RPC checks guarantee that event, ticket type, organizer, and merchant account belong together.

### `payment_order_terms_acceptances`

One order records every required document version accepted at checkout.

```sql
create table public.payment_order_terms_acceptances (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  terms_version_id uuid not null references public.legal_terms_versions(id) on delete restrict,
  accepted_at timestamptz not null,
  created_at timestamptz not null default now(),

  unique (order_id, terms_version_id)
);
```

Order creation must require the configured set of current terms versions. The order-level acceptance timestamp is a convenient summary; this table is authoritative evidence.

### `ticket_inventory_reservations`

```sql
create table public.ticket_inventory_reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null unique references public.payment_orders(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  client_user_id uuid not null references public.profiles(id) on delete restrict,
  capacity_pool public.ticket_capacity_pool not null,
  quantity integer not null default 1,
  status public.inventory_reservation_status not null default 'active',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ticket_inventory_reservations_one_ticket check (quantity = 1),
  constraint ticket_inventory_reservations_expiry_after_creation
    check (expires_at > created_at)
);
```

Indexes:

```sql
create unique index ticket_inventory_one_active_client_event
  on public.ticket_inventory_reservations(event_id, client_user_id)
  where status = 'active';

create index ticket_inventory_active_event_pool_idx
  on public.ticket_inventory_reservations(event_id, capacity_pool, expires_at)
  where status = 'active';

create index ticket_inventory_active_type_idx
  on public.ticket_inventory_reservations(ticket_type_id, expires_at)
  where status = 'active';
```

An `active` reservation counts only while `expires_at > now()`. Expiration processing changes stale rows to `expired`; capacity RPCs must also exclude expired timestamps defensively.

### `payment_attempts`

Every checkout/retry is append-only.

```sql
create table public.payment_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  provider text not null,
  attempt_number integer not null,
  status public.payment_attempt_status not null default 'created',
  idempotency_key uuid not null default extensions.gen_random_uuid(),
  external_checkout_id text,
  external_payment_intent_id text,
  checkout_url text,
  checkout_expires_at timestamptz,
  provider_status text,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_attempts_provider_not_blank check (length(trim(provider)) > 0),
  constraint payment_attempts_positive_number check (attempt_number > 0),
  constraint payment_attempts_unique_number unique (order_id, attempt_number),
  constraint payment_attempts_unique_idempotency unique (idempotency_key),
  constraint payment_attempts_unique_checkout unique (provider, external_checkout_id),
  constraint payment_attempts_unique_intent unique (provider, external_payment_intent_id)
);
```

Provider checkout URLs are treated as sensitive, short-lived data and should be cleared or access-restricted after expiration.

### `payments`

Stores provider-confirmed financial transactions. Multiple successful provider payments can be recorded for an operational exception, but exactly one may fulfill the order.

```sql
create table public.payments (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  payment_attempt_id uuid references public.payment_attempts(id) on delete restrict,
  merchant_account_id uuid not null references public.payment_merchant_accounts(id) on delete restrict,
  provider text not null,
  external_payment_id text not null,
  status public.payment_status not null,
  amount_cents integer not null,
  currency text not null,
  fulfills_order boolean not null default false,
  provider_status text,
  provider_created_at timestamptz,
  succeeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payments_provider_not_blank check (length(trim(provider)) > 0),
  constraint payments_external_id_not_blank check (length(trim(external_payment_id)) > 0),
  constraint payments_positive_amount check (amount_cents > 0),
  constraint payments_eur_only check (currency = 'EUR'),
  constraint payments_unique_external unique (provider, external_payment_id)
);

create unique index payments_one_fulfillment_per_order
  on public.payments(order_id)
  where fulfills_order;
```

A payment may set `fulfills_order = true` only when it is `succeeded`, matches the order amount/currency/merchant, and ticket fulfillment succeeds in the same database transaction.

### `organizer_transfers`

```sql
create table public.organizer_transfers (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  merchant_account_id uuid not null references public.payment_merchant_accounts(id) on delete restrict,
  provider text not null,
  external_transfer_id text,
  status public.organizer_transfer_status not null default 'pending',
  amount_cents integer not null,
  reversed_amount_cents integer not null default 0,
  currency text not null,
  provider_status text,
  transferred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organizer_transfers_positive_amount check (amount_cents >= 0),
  constraint organizer_transfers_reversal_range
    check (reversed_amount_cents between 0 and amount_cents),
  constraint organizer_transfers_eur_only check (currency = 'EUR'),
  constraint organizer_transfers_unique_order unique (order_id),
  constraint organizer_transfers_unique_external unique (provider, external_transfer_id)
);
```

For Stripe destination charges, the provider might represent fund movement differently from a standalone transfer. The adapter maps that behavior into this neutral allocation record.

### `provider_payouts`

Automatic payouts can batch multiple organizer transfers.

```sql
create table public.provider_payouts (
  id uuid primary key default extensions.gen_random_uuid(),
  merchant_account_id uuid not null references public.payment_merchant_accounts(id) on delete restrict,
  provider text not null,
  external_payout_id text not null,
  status public.provider_payout_status not null default 'unknown',
  amount_cents integer not null,
  currency text not null,
  arrival_date date,
  paid_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint provider_payouts_nonnegative_amount check (amount_cents >= 0),
  constraint provider_payouts_eur_only check (currency = 'EUR'),
  constraint provider_payouts_unique_external unique (provider, external_payout_id)
);
```

No exact transfer-to-payout join is required for the MVP unless the provider supplies reliable transaction-level allocation data. Reconciliation can associate payout balance transactions later without inventing a false one-to-one relationship.

### `payment_provider_events`

```sql
create table public.payment_provider_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  status public.provider_event_status not null default 'received',
  signature_verified boolean not null default false,
  livemode boolean not null,
  payload jsonb,
  payload_sha256 text not null,
  attempt_count integer not null default 0,
  received_at timestamptz not null default now(),
  processing_started_at timestamptz,
  processed_at timestamptz,
  next_retry_at timestamptz,
  last_error_code text,
  last_error_message text,

  constraint payment_provider_events_provider_not_blank check (length(trim(provider)) > 0),
  constraint payment_provider_events_external_id_not_blank check (length(trim(external_event_id)) > 0),
  constraint payment_provider_events_type_not_blank check (length(trim(event_type)) > 0),
  constraint payment_provider_events_hash_not_blank check (length(trim(payload_sha256)) > 0),
  constraint payment_provider_events_attempts_nonnegative check (attempt_count >= 0),
  constraint payment_provider_events_unique_external unique (provider, external_event_id)
);
```

Indexes:

```sql
create index payment_provider_events_retry_idx
  on public.payment_provider_events(status, next_retry_at)
  where status = 'failed';

create index payment_provider_events_received_idx
  on public.payment_provider_events(received_at desc);
```

Payload retention must be minimized and redacted. The hash proves payload identity after payload deletion. Signature verification occurs in the provider adapter before business processing.

### `payment_disputes`

```sql
create table public.payment_disputes (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  provider text not null,
  external_dispute_id text not null,
  status public.payment_dispute_status not null,
  amount_cents integer not null,
  currency text not null,
  reason text,
  evidence_due_at timestamptz,
  evidence_submitted_at timestamptz,
  provider_status text,
  opened_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_disputes_positive_amount check (amount_cents > 0),
  constraint payment_disputes_eur_only check (currency = 'EUR'),
  constraint payment_disputes_unique_external unique (provider, external_dispute_id),
  constraint payment_disputes_valid_close check (closed_at is null or closed_at >= opened_at)
);
```

An unused ticket is invalidated when a dispute is opened. A used ticket preserves check-in history.

### `payment_financial_adjustments`

Append-only ledger-like facts used for reconciliation and exceptions.

```sql
create table public.payment_financial_adjustments (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  organizer_transfer_id uuid references public.organizer_transfers(id) on delete restrict,
  dispute_id uuid references public.payment_disputes(id) on delete restrict,
  provider_event_id uuid references public.payment_provider_events(id) on delete restrict,
  adjustment_type public.financial_adjustment_type not null,
  amount_cents integer not null,
  currency text not null,
  external_balance_transaction_id text,
  description text not null,
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),

  constraint payment_financial_adjustments_nonzero check (amount_cents <> 0),
  constraint payment_financial_adjustments_eur_only check (currency = 'EUR')
);
```

Sign convention:

- Positive amount increases Inside Platform's net balance.
- Negative amount decreases Inside Platform's net balance.

The base platform gross fee remains on the order snapshot. Actual platform net is derived from that fee plus adjustments; it is not stored as a mutable truth field.

Indexes should cover `order_id`, `payment_id`, `dispute_id`, and `effective_at desc`.

## Required transactional database functions

Exact signatures can be finalized with migrations, but these security boundaries are required.

### `configure_event_fee`

Authenticated admin-only RPC.

Inputs:

- Event ID.
- Fee basis points.
- Fee payer.

Behavior:

- Locks event row.
- Rejects non-admin users.
- Rejects values outside `0..10000`.
- Rejects a locked configuration.
- Writes an audit record.

### `create_paid_order_with_reservation`

Authenticated client RPC.

Behavior in one transaction:

1. Lock event row.
2. Verify event is published/active, upcoming, and ticket type is active with positive EUR price.
3. Verify organizer merchant account is enabled for payments and payouts.
4. Reject an existing active/used ticket.
5. Reject an existing live/paid/disputed order.
6. Expire stale reservations for the relevant event/client.
7. Count active/used tickets plus unexpired active reservations for event pool and ticket type.
8. Calculate fee with integer half-up rounding.
9. Snapshot commercial, organizer, event, ticket, and customer values.
10. Record required terms acceptances.
11. Create one 15-minute active reservation.
12. Write an audit record.

The client never supplies calculated amounts, organizer ID, merchant account, or fee policy.

### `expire_paid_order_reservation`

Internal/service operation.

- Locks order and reservation.
- Changes an unpaid expired order to `expired`.
- Changes reservation to `expired`.
- Does nothing idempotently when already terminal.

### `complete_paid_order`

Internal service-role operation called only after verified provider processing.

Inputs identify local provider event/payment facts, not browser claims.

Behavior in one transaction:

1. Lock provider event, event, ticket type, order, reservation, and relevant payment rows in the global order defined below.
2. Verify event/order/client/ticket type/merchant relationships.
3. Verify succeeded amount and EUR currency match immutable order values.
4. Verify provider account/destination matches the order merchant account.
5. Return existing success idempotently if already fulfilled.
6. If reservation expired, atomically re-check current capacity and user uniqueness.
7. Record the provider-confirmed payment.
8. Set exactly one payment as `fulfills_order`.
9. Create organizer transfer allocation.
10. Consume the reservation.
11. Create exactly one ticket with `payment_order_id` and existing snapshots.
12. Set order `paid` and `paid_at`.
13. Lock event fee configuration if not already locked.
14. Lock ticket type price if not already locked.
15. Mark provider event processed.
16. Write audit records.

If late fulfillment is impossible, record the payment without setting `fulfills_order`, flag admin exception handling, and do not oversell or create a ticket.

### `open_or_update_payment_dispute`

Internal service operation.

- Upserts by provider/external dispute ID.
- Changes order to `disputed` without deleting paid history.
- Invalidates an unused ticket.
- Preserves used ticket and check-in history.
- Creates financial adjustments and transfer reversal/recovery state as provider facts arrive.
- Is idempotent for repeated/out-of-order dispute events.

## Required modifications to existing RPCs

### Free ticket claim

`claim_ticket_for_type` must:

- Treat `price_cents = 0` as free regardless of capacity pool.
- Reject positive-price ticket types and direct the application to paid checkout.
- Lock the event row using the same order as paid reservation creation.
- Check for live paid orders and unexpired reservations for the same client/event.
- Count paid reservations when evaluating shared capacity.
- Preserve the existing one-ticket-per-event rule.

### Event editing

`update_upcoming_event_with_ticket_types` must:

- Prevent price/currency/capacity-pool changes for price-locked types.
- Include unexpired paid reservations when reducing capacity.
- Preserve locked event fee fields.

### Event cancellation

`cancel_event_if_no_revenue` must reject cancellation when any order is `paid` or `disputed`, independently of ticket snapshot sums. Exceptional cancellation is a separate admin process.

## RLS policy matrix

All new tables have RLS enabled.

| Table | Client | Organizer | Admin | Mutations |
|---|---|---|---|---|
| `payment_merchant_accounts` | none | read own | read all | guarded server operations only |
| `legal_terms_versions` | read effective public metadata | read | manage | admin/server only |
| `payment_orders` | read own | read own-event financial rows | read all | RPC/service only |
| `payment_order_terms_acceptances` | read own order | no customer evidence metadata by default | read all | order RPC only |
| `ticket_inventory_reservations` | read own summary | read own-event summary | read all | RPC/service only |
| `payment_attempts` | read own safe status | read own-event safe status | read all | server/provider adapter only |
| `payments` | read own safe payment summary | read own-event financial summary | read all | webhook/service only |
| `organizer_transfers` | none | read own | read all | webhook/service only |
| `provider_payouts` | none | read own | read all | synchronization service only |
| `payment_provider_events` | none | none | read operational metadata | webhook/service only |
| `payment_disputes` | read own limited status | read own event | read all | webhook/admin service only |
| `payment_financial_adjustments` | none | read own-event relevant entries | read all | service only; no update/delete |

Public/client/organizer views should expose safe projections instead of raw provider payloads, checkout URLs, internal errors, IP hashes, or unnecessary evidence.

No authenticated role receives direct insert/update/delete policies for core financial tables. Mutations use narrowly scoped `security definer` RPCs or server-only service operations with fixed `search_path`, explicit authorization, and audit logging.

## Trigger and immutability rules

- Reuse `set_updated_at` on mutable synchronization/state tables.
- No `updated_at` on append-only terms acceptances or financial adjustments.
- Add triggers that reject changes to immutable order snapshot columns after insert.
- Add triggers that reject update/delete of financial adjustments except a controlled database-owner maintenance path.
- Add triggers or guarded RPCs preventing event fee changes after lock.
- Add guarded rules preventing ticket type financial changes after price lock.
- Do not cascade-delete paid financial history from users, events, ticket types, merchant accounts, orders, payments, transfers, disputes, or terms.

## Concurrency lock order

Every RPC that touches capacity or fulfillment must lock applicable rows in this order to reduce deadlocks:

1. `payment_provider_events` when processing a provider event
2. `events`
3. `ticket_types`
4. `payment_orders`
5. `ticket_inventory_reservations`
6. `payment_attempts` / `payments`
7. `tickets`
8. `organizer_transfers`

Free claims use the same event-then-ticket-type order.

## Retention and sensitive data

- Never store raw card data, bank credentials, identity documents, provider secret keys, or webhook signing secrets.
- Treat checkout URLs, provider payloads, IP-derived evidence, user agents, internal error messages, and dispute evidence as restricted.
- Hash IP evidence with a rotating/managed secret rather than storing raw IP addresses unless legal review requires otherwise.
- Define retention periods before production. Payload content may be deleted while retaining event ID, type, timestamps, processing result, and payload hash.
- Deleting a user account requires a legal retention/anonymization process rather than cascading financial deletion.

## Migration sequence after approval

1. Enums and event fee fields without circular foreign key.
2. Merchant accounts and legal terms versions.
3. Payment orders and terms acceptances.
4. Add circular fee/price lock foreign keys.
5. Inventory reservations.
6. Attempts, payments, transfers, and payout references.
7. Provider events, disputes, and financial adjustments.
8. RLS policies and safe database views.
9. Transactional RPCs and immutability triggers.
10. Modify existing claim, edit, and cancellation RPCs.
11. Regenerate Supabase TypeScript types.
12. Add integration and concurrency tests before provider SDK work.

## Phase 2 approval checklist

Before migrations, approve or revise:

- Table and enum names.
- One order per ticket and one ticket per user/event.
- Fifteen-minute reservation duration.
- EUR-only positive-price order constraint.
- `0..10000` basis-point range and half-up formula.
- Immutable order snapshots and price/fee locks.
- Multiple provider payments may be recorded but only one fulfills an order.
- Automatic payout records are informational and not falsely mapped one-to-one to orders.
- No direct authenticated mutations on financial tables.
- Organizer/client/admin read boundaries.
- Append-only adjustment sign convention.
- Payload/evidence minimization and retention approach.
