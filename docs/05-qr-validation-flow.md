# QR Validation Flow

## Implemented routes

- Staff validation UI: `/staff/events/[eventId]/validate`
- State-changing scan endpoint: POST `/staff/events/[eventId]/scan`
- Safe legacy QR route: `/validate/[qrToken]`

The legacy route displays instructions and never validates or consumes a ticket through GET. All real QR validation is performed in the event-specific staff flow.

## Implemented methods

### Camera QR scanning

The staff UI uses the device camera to read a ticket QR token. The token is submitted to the event-specific POST endpoint, which performs all authorization and validation server-side.

### Manual ticket code

Staff can enter the unique human-readable ticket code when camera scanning is unavailable. Manual and QR validation use the same database-enforced business rules.

## Authorization

Before validation, the server verifies:

1. The validator is authenticated.
2. The validator has an allowed role.
3. Event staff are assigned to the selected event; admins have broader authority.
4. The selected event exists and is the event being operated.

The server never trusts a role, acting user ID, or authorization result supplied by the browser.

## Ticket validation

The database operation checks:

1. The token or manual code identifies a ticket when possible.
2. The ticket belongs to the selected event.
3. The ticket is active.
4. The ticket has not already been used.
5. The validator is authorized for the event.

On success, one atomic operation:

- Changes status from `active` to `used`.
- Sets `used_at`.
- Sets `used_by`.
- Creates a successful `check_ins` record.

Concurrent scans of the same ticket must result in one success and subsequent `already_used` results.

## Validation results

Supported results include:

- `success`: ticket consumed successfully.
- `already_used`: ticket was previously consumed.
- `invalid_ticket`: no valid ticket was identified.
- `wrong_event`: ticket belongs to a different event.
- `unauthorized`: validator lacks event authority.
- `error`: validation could not complete safely.

Failed results do not modify ticket status. Every attempt is recorded in `check_ins` when the available identifiers and authorization context make recording possible.

## Scanner behavior

- The scanner prevents accidental rapid local repeats while a request is in flight.
- Clear result states are shown in a modal.
- Invalid or unexpected QR payloads fail safely.
- The camera can be stopped and restarted without changing server state.
- The server response, not the scanner UI, determines validity.

## Security requirements

- Never perform validation through a GET request.
- Never place secret keys in scanner code.
- Rate limit event scan requests.
- Treat QR tokens as credentials and avoid logging them unnecessarily.
- Keep the selected event explicit and verify wrong-event scans server-side.
- Preserve failed-attempt audit data without exposing unrelated client information.
- Maintain atomic active-to-used transitions.

## Interaction with planned paid tickets

Payment does not change entrance validation mechanics. A paid ticket becomes scannable only after a verified payment webhook has issued it.

If a paid order becomes disputed before use, the approved payment flow invalidates the unused ticket. Used-ticket and post-event disputes remain financial/operational cases and do not rewrite check-in history.

The scanner must use ticket status as the operational authority and must not call a payment provider during entrance validation.
