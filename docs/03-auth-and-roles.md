# Authentication and Roles

## Purpose

The platform uses authentication and role-based authorization to control what each user can see and do.

Authentication answers: who is the user?

Authorization answers: what is this user allowed to do?

The MVP must support:

- user signup
- user login
- user logout
- profile creation
- default client role
- manually assigned elevated roles
- protected routes
- role-dependent dashboards
- server-side authorization checks

## User Roles

The MVP has four roles:

- client
- event_organizer
- event_staff
- admin

New users are clients by default.

Other roles are manually assigned in the database during the MVP phase.

## Role: client

The client role is the default role for all new users.

A client can:

- view public event pages
- claim tickets for events
- view their own tickets
- view their own QR codes
- access the client dashboard

A client cannot:

- access organizer dashboards
- access the staff authentication page
- validate tickets
- view other users' tickets
- view event statistics
- change their own role

## Role: event_organizer

An event organizer manages their own events.

An event organizer can:

- create events
- view events they own
- view statistics for their own events
- see ticket counts for their own events
- see check-in counts for their own events
- see remaining capacity for their own events

An event organizer cannot:

- view events owned by other organizers
- access global admin statistics
- validate tickets unless they are also event_staff or admin
- change platform-level user roles

## Role: event_staff

Event staff validate tickets at the entrance.

Event staff can:

- access the staff dashboard
- access the authenticate page
- validate tickets for assigned events
- scan QR codes
- manually enter ticket codes
- create check-in records through validation actions

Event staff cannot:

- create events
- view global statistics
- validate tickets for events they are not assigned to
- view private client data unrelated to validation
- change user roles

## Role: admin

Admin is the highest permission level.

An admin can:

- access all dashboards
- view all users
- view all events
- view all tickets
- view all check-ins
- validate tickets for any event
- view global platform statistics
- manually change user roles

Admins should be rare and manually assigned.

## Default Signup Behavior

When a new user signs up:

1. A new authentication user is created.
2. A new profile row is created.
3. The profile role is set to client by default.

Default role:

- client

No new user should automatically become event_organizer, event_staff, or admin.

## Manual Role Assignment

During the MVP phase, elevated roles are assigned manually in the database.

The app does not need a complete role management interface yet.

Valid role values:

- client
- event_organizer
- event_staff
- admin

Only admins should be allowed to update roles through application logic.

## Profiles Table

The profiles table stores user profile and role data.

Required fields:

- id
- full_name
- email
- role
- created_at
- updated_at

Rules:

- id references the authenticated user ID.
- role is client by default.
- only admins should change role values.
- the app must never trust role values sent from the browser.

## Role-Based Dashboard

The dashboard route should be:

- /dashboard

This route should be role-aware.

After login, the app should:

1. Read the authenticated user.
2. Fetch the user's profile.
3. Read the user's role.
4. Render the correct dashboard module.

Dashboard modules:

- ClientDashboard
- OrganizerDashboard
- StaffDashboard
- AdminDashboard

Do not create four unrelated dashboard systems.

The /dashboard page should behave as a role-aware dashboard container.

## Protected Routes

These routes require authentication:

- /dashboard
- /tickets/[ticketId]
- /authenticate

These routes may be public:

- /
- /login
- /signup
- /events/[eventId]

## Route Access Rules

### /dashboard

Allowed roles:

- client
- event_organizer
- event_staff
- admin

Behavior:

- render the correct dashboard module based on role

### /authenticate

Allowed roles:

- event_staff
- admin

Not allowed:

- unauthenticated users
- client
- event_organizer unless future logic explicitly allows it

### /tickets/[ticketId]

Allowed users:

- the ticket owner
- admin
- authorized staff only during validation-related flows if needed

Not allowed:

- unrelated clients
- unrelated staff
- unrelated organizers

### Organizer event statistics

Allowed users:

- organizer who owns the event
- admin

Not allowed:

- other organizers
- clients
- unrelated staff

## Server-Side Authorization

Authorization must not depend only on frontend checks.

Frontend checks are useful for hiding buttons and pages, but they are not enough.

Every sensitive operation must be protected server-side.

Sensitive operations include:

- creating tickets
- validating tickets
- reading event statistics
- reading tickets
- assigning staff
- updating event data
- changing user roles

## Authorization Principles

Use these principles:

- clients can only access their own data
- event_organizers can only access their own events
- event_staff can only validate assigned events
- admins can access everything
- unauthenticated users cannot perform protected actions

## Unauthorized Behavior

If a user is not logged in and tries to access a protected page:

- redirect to /login

If a logged-in user tries to access a forbidden page:

- redirect to /unauthorized

If a user tries to perform an unauthorized server action:

- return an authorization error
- do not perform the action

## Security Rules

The app must never expose secret keys in client-side code.

The app must never trust role values sent from the browser.

The app must always read the authenticated user's role from the database.

The app must not allow users to change their own role.

The app must not allow clients to create tickets for other users.

The app must not allow staff to validate tickets for unassigned events.

## MVP Acceptance Criteria

Authentication and roles are correctly implemented when:

- new users are created as clients by default
- users can sign up
- users can log in
- users can log out
- /dashboard renders different modules based on role
- clients cannot access /authenticate
- event_staff users can access /authenticate
- admins can access all protected areas
- role checks happen server-side
- users cannot access other users' private tickets
- organizers cannot see events they do not own
