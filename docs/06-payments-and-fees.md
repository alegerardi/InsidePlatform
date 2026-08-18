# Payments and Fees

**Status: Planned — approved design. None of this document should be treated as implemented until migrations, application code, provider configuration, and tests are complete.**

## Commercial roles

- The organizer is the seller and provider of the event ticket.
- Inside Platform acts as an intermediary and payment platform.
- The organizer is responsible for event fulfillment and ticket-sale VAT/tax obligations.
- Inside Platform does not calculate or remit ticket VAT in the first paid MVP.
- Inside Platform's own tax/accounting obligations remain a legal and accounting matter even though VAT automation is outside product scope.

The seller/intermediary structure and customer wording require legal confirmation before production launch.

## Provider-neutral architecture

Stripe Connect is the first provider, not the domain model.

Core code uses concepts such as:

- Merchant account
- Checkout
- Payment attempt
- Payment
- Organizer transfer
- Provider-managed payout
- Provider event
- Dispute

Provider-specific identifiers live in external-reference fields and the provider adapter. Core event, order, ticket, fee, and dispute logic must not import Stripe-specific objects.

The application-facing boundary should support operations equivalent to:

```ts
interface PaymentProvider {
  createMerchantAccount(): Promise<MerchantAccountResult>;
  createOnboardingSession(): Promise<OnboardingResult>;
  getMerchantAccountStatus(): Promise<MerchantAccountStatus>;
  createCheckout(): Promise<CheckoutResult>;
  retrievePayment(): Promise<PaymentResult>;
  reverseOrganizerTransfer(): Promise<TransferReversalResult>;
  parseAndVerifyWebhook(): Promise<ProviderEvent>;
}
```

The first adapter is `StripePaymentProvider`. A future provider can be added without rewriting ticket and order rules.

## Initial Stripe model

- Stripe Connect provides connected organizer accounts.
- Stripe-hosted onboarding collects identity, business, and bank information.
- Destination charges are the initial intended funds flow, subject to final seller/settlement-merchant review during integration.
- Stripe manages automatic payouts from organizer balances to organizer bank accounts.
- Stripe Tax is disabled.
- Raw card data never passes through or is stored by Inside Platform.

Stripe pricing can include processing, Connect, payout, currency-conversion, dispute, and optional-product costs. Actual provider costs must be reconciled rather than assumed.

## Organizer onboarding

1. Organizer requests payment activation.
2. Inside Platform creates a provider merchant account.
3. Organizer completes provider-hosted onboarding.
4. Provider verifies required identity, business, and bank information.
5. Inside Platform synchronizes onboarding and capability status.
6. Paid ticket publication is permitted only when payments and payouts are enabled.

Organizers may create drafts before onboarding and may run free events without onboarding.

## Event fee configuration

Each event has:

```text
platform_fee_basis_points
fee_payer: customer | organizer
fee_configuration_locked_at
fee_configuration_locked_by_order_id
```

Defaults:

```text
platform_fee_basis_points = 1000
fee_payer = customer
```

Rules:

- `1000` basis points equals 10%.
- Valid range is `0` through `10000` basis points.
- Only an admin can edit the fee configuration.
- Organizers may view their assigned terms but cannot edit them.
- Admins may edit until the first successful paid order.
- The first successful paid order locks the entire event configuration.
- Free claims, failures, and expirations do not lock it.
- Refunds and disputes do not unlock it.

## Calculation and rounding

Money is stored as integer cents. Percentages are stored as integer basis points.

```text
platform_fee_cents = nearest_cent(ticket_price_cents × basis_points / 10000)
```

Use standard half-up commercial rounding at the half-cent boundary. All services, database functions, checkout creation, and tests must use one shared rule.

### Customer pays

For a €10.00 ticket and 10% fee:

```text
Nominal ticket price       €10.00
Platform/service fee        €1.00
Customer total             €11.00
Organizer proceeds         €10.00
Platform gross fee          €1.00
Platform actual net         €1.00 - actual provider costs
```

### Organizer pays

For a €10.00 ticket and 10% fee:

```text
Nominal ticket price       €10.00
Customer total             €10.00
Platform fee                €1.00
Organizer proceeds          €9.00
Platform gross fee          €1.00
Platform actual net         €1.00 - actual provider costs
```

The platform percentage always applies to the nominal ticket price, not the customer total.

Inside Platform does not attempt to pass through the exact provider processing fee. It absorbs positive or negative cost variation from its retained platform fee.

## Customer price presentation

Public event listings show the nominal price with a general label:

```text
€10.00 + fees
```

Before payment authorization, checkout shows the exact nominal price, platform/service fee, and final customer total. Organizer identity, terms, privacy notice, no-refund policy subject to law, and event-cancellation policy must also be available.

For organizer-paid events, no fee is added to the customer total.

## Currency

- The first paid MVP accepts only EUR.
- Currency is still snapshotted on ticket types, orders, payments, fees, and transfers.
- Multi-currency pricing and conversion are out of scope.

## Price locking

- A ticket type's price becomes immutable after its first successful paid purchase.
- A sold ticket type can be deactivated, not financially rewritten.
- New types may be added before the event starts if capacity remains.
- New types use the event's already-locked fee policy.

## Refunds and cancellation

- No customer refund interface.
- No organizer refund interface.
- No partial refunds.
- Provider/manual refund events must still be recognized if they occur externally.
- An event with a successful paid order cannot be cancelled through the normal organizer flow.
- Paid-event cancellation requires an exceptional admin-managed process and full audit evidence.
- Product policy cannot override mandatory consumer rights.

## Disputes and chargebacks

Chargebacks cannot be disabled.

Approved responsibility model:

- Inside Platform manages the provider dispute operationally.
- The organizer remains responsible for the disputed ticket value.
- Inside Platform may reverse or recover the organizer transfer.
- Inside Platform initially absorbs the provider dispute fee unless future commercial terms change this.
- An unused disputed ticket is invalidated.
- A used ticket or post-event dispute preserves entrance history and becomes a financial/evidence case.

## Evidence and reconciliation

Orders preserve immutable snapshots of nominal price, fee basis points, fee payer, fee amount, customer total, organizer proceeds, currency, parties, event, ticket type, and accepted terms.

The system also retains proportionate records of:

- Payment attempts and status transitions.
- Verified provider events and processing outcomes.
- External payment, transfer, payout, and dispute references.
- Actual provider costs and platform net.
- Ticket issuance and validation.
- Admin and exceptional actions.
- Terms version, acceptance time, and appropriate request metadata.

Evidence must be access-controlled, minimized, protected, and deleted according to a documented privacy and retention policy.

## Out of scope

- Stripe Tax.
- Automated VAT calculation, filing, or remittance.
- Refund and partial-refund interfaces.
- Multiple tickets per purchase.
- Non-EUR payments.
- Manual payout scheduling by Inside Platform.
