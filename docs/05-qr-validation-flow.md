# QR Validation Flow

## Purpose

The QR validation flow allows event staff to authenticate tickets at the entrance of an event.

The MVP must support:

- QR code scanning
- manual ticket code input
- server-side ticket validation
- role-based access control
- event staff assignment checks
- ticket status updates
- check-in history
- clear validation results

This is one of the most security-sensitive parts of the platform.

The frontend can scan and display results, but the server must decide whether a ticket is valid.

## Main Route

The main validation route is:

- /authenticate

Only authorized users can access this route.

Allowed roles:

- event_staff
- admin

Not allowed:

- unauthenticated users
- client
- event_organizer unless future logic explicitly allows it

If a user is not logged in, redirect to:

- /login

If a logged-in user does not have permission, redirect to:

- /unauthorized

## Validation Methods

The MVP should support two ticket validation methods:

1. QR code scanning
2. Manual ticket code input

Both methods must call the same server-side validation logic.

The validation result must not be decided in the browser.

## QR Code Scanning

Each ticket has a unique qr_token.

The QR code should contain the ticket qr_token.

Recommended QR payload for the MVP:

- qr_token

When the QR code is scanned:

1. The frontend reads the QR token.
2. The frontend sends the QR token to the server.
3. The server looks for a ticket with that QR token.
4. The server checks authorization and ticket validity.
5. The server returns the validation result.
6. The frontend displays the result clearly.

## Manual Ticket Code Input

Staff should also be able to manually enter a ticket code.

This is useful when:

- the camera does not work
- the QR code is damaged
- the user's phone brightness is too low
- the staff member needs a fallback method

Manual validation flow:

1. Staff enters the ticket code.
2. The frontend sends the ticket code to the server.
3. The server looks for a ticket with that ticket code.
4. The server checks authorization and ticket validity.
5. The server returns the result.
6. The frontend displays the result clearly.

## Ticket Identification

A ticket can be identified by:

- qr_token
- ticket_code

The QR scanner should use qr_token.

The manual input should use ticket_code.

Both methods should eventually call the same validation service or server action.

## Server-Side Validation Checks

When validating a ticket, the server must check:

1. The user performing the validation is authenticated.
2. The user has role event_staff or admin.
3. The ticket exists.
4. The related event exists.
5. The ticket belongs to the correct event.
6. The ticket status is active.
7. The ticket has not already been used.
8. The event is currently valid for check-in.
9. If the validator is event_staff, they are assigned to that event.
10. If the validator is admin, allow validation.

The server must not trust role, user ID, event ID, or permission data sent from the browser.

The server must read the authenticated user and role from the database.

## Event Staff Authorization

Event staff can only validate tickets for events they are assigned to.

Staff assignment is stored in:

- event_staff_assignments

The validation logic must check whether the current staff user has an assignment for the ticket's event.

Admins can validate tickets for any event.

## Event Selection

The validation page should know which event is being validated.

Recommended MVP approach:

- Staff dashboard shows assigned events.
- Staff selects an event before scanning.
- QR token identifies the ticket.
- Server confirms that the ticket belongs to the selected event.
- Server confirms that the staff member is assigned to that event.

This prevents staff from accidentally validating tickets for the wrong event.

## Successful Validation

If the ticket is valid:

1. Update the ticket status to used.
2. Set used_at to the current timestamp.
3. Set used_by to the staff or admin user ID.
4. Create a check_ins record with result success.
5. Return a success result to the frontend.

Success message:

- Ticket valid. Check-in successful.

## Already Used Ticket

If the ticket was already used:

1. Do not update the ticket.
2. Create a check_ins record with result already_used.
3. Return a warning result to the frontend.

Message:

- This ticket has already been used.

The frontend should display this clearly as a warning.

## Invalid Ticket

If the QR token or ticket code does not match any ticket:

1. Do not update any ticket.
2. Create a failed check-in record if possible.
3. Return an invalid result.

Message:

- Invalid ticket.

## Wrong Event

If the ticket exists but belongs to another event:

1. Do not update the ticket.
2. Create a check_ins record with result wrong_event.
3. Return a warning result.

Message:

- This ticket belongs to another event.

## Unauthorized Staff

If the staff member is not assigned to the event:

1. Do not update the ticket.
2. Create a check_ins record with result unauthorized.
3. Return an authorization error.

Message:

- You are not authorized to validate tickets for this event.

## Check-In Records

Every validation attempt should create a row in the check_ins table whenever possible.

The check_ins table stores:

- id
- ticket_id
- event_id
- checked_by
- result
- message
- checked_at

The ticket_id can be null only when no matching ticket is found.

The event_id can be null only when no event can be identified.

## Check-In Result Values

Valid check_ins.result values:

- success
- already_used
- invalid_ticket
- wrong_event
- unauthorized
- error

## Why Failed Attempts Are Stored

Failed validation attempts are useful for:

- detecting repeated invalid scans
- identifying fraud attempts
- auditing staff activity
- debugging entrance problems
- generating future analytics
- understanding operational issues during events

## Ticket Update Rules

Only successful validation should update the ticket.

Successful validation updates:

- status = used
- used_at = current timestamp
- used_by = current staff or admin user ID

Failed validation must not change the ticket status.

## Race Condition Protection

The system must avoid validating the same ticket twice at the same time.

Possible problem:

- Two staff members scan the same ticket at the same moment.

Correct behavior:

- Only one validation succeeds.
- The second validation returns already_used.

Recommended implementation rule:

- only update a ticket from active to used
- if the ticket status is already used, return already_used
- use atomic update logic where possible

## Frontend Result States

The frontend should display clear visual results.

### Success

Message:

- Valid ticket. Check-in successful.

### Already Used

Message:

- Ticket already used.

### Invalid Ticket

Message:

- Invalid ticket.

### Wrong Event

Message:

- Wrong event.

### Unauthorized

Message:

- You are not authorized to validate this ticket.

### Error

Message:

- Something went wrong during validation.

## Security Rules

The QR validation flow must follow these rules:

- validation must happen server-side
- clients cannot access /authenticate
- unauthenticated users cannot access /authenticate
- staff cannot validate tickets for unassigned events
- admins can validate tickets for all events
- the frontend must not decide if a ticket is valid
- the app must not expose secret keys in the browser
- the app must not mark a ticket as used before all checks pass
- the app must prevent duplicate successful validations
- failed validations must not update the ticket status

## Recommended Server Action or API Behavior

The validation logic should accept one of these inputs:

- qr_token
- ticket_code

Optional input:

- event_id

The server should return a structured result with:

- success
- result
- message
- ticketId
- eventId

Possible result values:

- success
- already_used
- invalid_ticket
- wrong_event
- unauthorized
- error

## MVP Acceptance Criteria

The QR validation flow is correctly implemented when:

- unauthenticated users cannot access /authenticate
- clients cannot access /authenticate
- event_staff users can access /authenticate
- admins can access /authenticate
- staff can scan a QR code
- staff can manually enter a ticket code
- valid tickets are marked as used
- used tickets cannot be validated again
- invalid tickets return an error
- wrong-event tickets return an error
- unassigned staff cannot validate tickets
- every validation attempt is saved in check_ins
- validation happens server-side
- ticket status changes only after all validation checks pass
