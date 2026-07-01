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

```text
/authenticate