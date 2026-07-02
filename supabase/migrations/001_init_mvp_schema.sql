-- 001_init_mvp_schema.sql
-- MVP schema for role-based event ticket and QR authentication platform.

begin;

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- =========================
-- ENUM TYPES
-- =========================

do $$
begin
  create type public.user_role as enum (
    'client',
    'event_organizer',
    'event_staff',
    'admin'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_status as enum (
    'draft',
    'published',
    'active',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ticket_status as enum (
    'active',
    'used',
    'cancelled',
    'expired',
    'invalid'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.check_in_result as enum (
    'success',
    'already_used',
    'invalid_ticket',
    'wrong_event',
    'unauthorized',
    'error'
  );
exception
  when duplicate_object then null;
end $$;

-- =========================
-- TABLES
-- =========================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  role public.user_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.event_status not null default 'draft',
  max_tickets integer not null default 0 check (max_tickets >= 0),
  max_guest_list integer not null default 0 check (max_guest_list >= 0),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint event_staff_assignments_unique_staff_per_event
    unique (event_id, staff_user_id)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ticket_code text not null unique,
  qr_token text not null unique,
  status public.ticket_status not null default 'active',
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references public.profiles(id) on delete set null,

  constraint tickets_unique_user_per_event unique (event_id, user_id)
);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  checked_by uuid references public.profiles(id) on delete set null,
  result public.check_in_result not null,
  message text,
  checked_at timestamptz not null default now()
);

-- =========================
-- INDEXES
-- =========================

create index if not exists profiles_role_idx
  on public.profiles(role);

create index if not exists events_organizer_id_idx
  on public.events(organizer_id);

create index if not exists events_status_idx
  on public.events(status);

create index if not exists event_staff_assignments_event_id_idx
  on public.event_staff_assignments(event_id);

create index if not exists event_staff_assignments_staff_user_id_idx
  on public.event_staff_assignments(staff_user_id);

create index if not exists tickets_event_id_idx
  on public.tickets(event_id);

create index if not exists tickets_user_id_idx
  on public.tickets(user_id);

create index if not exists tickets_status_idx
  on public.tickets(status);

create index if not exists tickets_qr_token_idx
  on public.tickets(qr_token);

create index if not exists tickets_ticket_code_idx
  on public.tickets(ticket_code);

create index if not exists check_ins_ticket_id_idx
  on public.check_ins(ticket_id);

create index if not exists check_ins_event_id_idx
  on public.check_ins(event_id);

create index if not exists check_ins_checked_by_idx
  on public.check_ins(checked_by);

-- =========================
-- UPDATED_AT TRIGGER
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

-- =========================
-- PROFILE CREATION TRIGGER
-- =========================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role
  )
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    'client'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =========================
-- SECURITY HELPER FUNCTIONS
-- =========================

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  )
$$;

create or replace function public.has_role(
  target_user_id uuid,
  required_role public.user_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and role = required_role
  )
$$;

create or replace function public.is_event_owner(
  target_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events
    where id = target_event_id
      and organizer_id = auth.uid()
  )
$$;

create or replace function public.is_staff_for_event(
  target_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_staff_assignments
    where event_id = target_event_id
      and staff_user_id = auth.uid()
  )
$$;

-- =========================
-- ROW LEVEL SECURITY
-- =========================

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_staff_assignments enable row level security;
alter table public.tickets enable row level security;
alter table public.check_ins enable row level security;

-- =========================
-- PROFILES POLICIES
-- =========================

drop policy if exists "profiles_select_own_or_admin" on public.profiles;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

-- No client INSERT policy.
-- Profiles are created only by the auth.users trigger.

-- No client UPDATE policy in this layer.
-- This prevents users from updating their own role.

-- No client DELETE policy.

-- =========================
-- EVENTS POLICIES
-- =========================

drop policy if exists "events_select_public_or_authorized" on public.events;
drop policy if exists "events_insert_organizer_or_admin" on public.events;
drop policy if exists "events_update_owner_or_admin" on public.events;
drop policy if exists "events_delete_owner_or_admin" on public.events;

create policy "events_select_public_or_authorized"
on public.events
for select
to anon, authenticated
using (
  status in ('published', 'active')
  or organizer_id = auth.uid()
  or public.is_admin()
);

create policy "events_insert_organizer_or_admin"
on public.events
for insert
to authenticated
with check (
  public.is_admin()
  or (
    organizer_id = auth.uid()
    and public.current_user_role() = 'event_organizer'
  )
);

create policy "events_update_owner_or_admin"
on public.events
for update
to authenticated
using (
  public.is_admin()
  or (
    organizer_id = auth.uid()
    and public.current_user_role() = 'event_organizer'
  )
)
with check (
  public.is_admin()
  or (
    organizer_id = auth.uid()
    and public.current_user_role() = 'event_organizer'
  )
);

create policy "events_delete_owner_or_admin"
on public.events
for delete
to authenticated
using (
  public.is_admin()
  or (
    organizer_id = auth.uid()
    and public.current_user_role() = 'event_organizer'
  )
);

-- =========================
-- EVENT STAFF ASSIGNMENT POLICIES
-- =========================

drop policy if exists "event_staff_assignments_select_authorized" on public.event_staff_assignments;
drop policy if exists "event_staff_assignments_insert_owner_or_admin" on public.event_staff_assignments;
drop policy if exists "event_staff_assignments_update_owner_or_admin" on public.event_staff_assignments;
drop policy if exists "event_staff_assignments_delete_owner_or_admin" on public.event_staff_assignments;

create policy "event_staff_assignments_select_authorized"
on public.event_staff_assignments
for select
to authenticated
using (
  public.is_admin()
  or staff_user_id = auth.uid()
  or public.is_event_owner(event_id)
);

create policy "event_staff_assignments_insert_owner_or_admin"
on public.event_staff_assignments
for insert
to authenticated
with check (
  (
    public.is_admin()
    or public.is_event_owner(event_id)
  )
  and public.has_role(staff_user_id, 'event_staff')
);

create policy "event_staff_assignments_update_owner_or_admin"
on public.event_staff_assignments
for update
to authenticated
using (
  public.is_admin()
  or public.is_event_owner(event_id)
)
with check (
  (
    public.is_admin()
    or public.is_event_owner(event_id)
  )
  and public.has_role(staff_user_id, 'event_staff')
);

create policy "event_staff_assignments_delete_owner_or_admin"
on public.event_staff_assignments
for delete
to authenticated
using (
  public.is_admin()
  or public.is_event_owner(event_id)
);

-- =========================
-- TICKETS POLICIES
-- =========================

drop policy if exists "tickets_select_authorized" on public.tickets;
drop policy if exists "tickets_insert_own_ticket" on public.tickets;
drop policy if exists "tickets_update_staff_or_admin" on public.tickets;

create policy "tickets_select_authorized"
on public.tickets
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.is_event_owner(event_id)
  or public.is_staff_for_event(event_id)
);

create policy "tickets_insert_own_ticket"
on public.tickets
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events
    where id = event_id
      and status in ('published', 'active')
  )
);

create policy "tickets_update_staff_or_admin"
on public.tickets
for update
to authenticated
using (
  public.is_admin()
  or public.is_staff_for_event(event_id)
)
with check (
  public.is_admin()
  or public.is_staff_for_event(event_id)
);

-- No client DELETE policy for tickets.

-- =========================
-- CHECK-INS POLICIES
-- =========================

drop policy if exists "check_ins_select_authorized" on public.check_ins;
drop policy if exists "check_ins_insert_staff_or_admin" on public.check_ins;

create policy "check_ins_select_authorized"
on public.check_ins
for select
to authenticated
using (
  public.is_admin()
  or checked_by = auth.uid()
  or public.is_event_owner(event_id)
  or public.is_staff_for_event(event_id)
);

create policy "check_ins_insert_staff_or_admin"
on public.check_ins
for insert
to authenticated
with check (
  checked_by = auth.uid()
  and (
    public.is_admin()
    or event_id is null
    or public.is_staff_for_event(event_id)
  )
);

-- No UPDATE or DELETE policy for check-in records.

commit;